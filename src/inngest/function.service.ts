import { Injectable } from "@nestjs/common";
import { inngest } from "./inngest.provider";
import { AssignmentService } from "src/assignments/assignment.service";
import { UserService } from "src/users/user.service";
import { FirebaseService } from "src/firebase.service";
import { ChoreRepository } from "src/chores/chore.repository";
import { HouseRepository } from "src/houses/house.repository";
import { groupBy, shuffle } from "lodash";
import { ChoreService } from "src/chores/chore.service";
import { isEmpty, isNil, isPresent, toRecord } from "src/utils";
import { NonRetriableError } from "inngest";
import { AssignmentRepository } from "src/assignments/assignment.repository";

@Injectable()
export class FunctionService {
  constructor(
    private readonly _assignmentService: AssignmentService,
    private readonly _assignmentRepository: AssignmentRepository,
    private readonly _choreRepository: ChoreRepository,
    private readonly _choreService: ChoreService,
    private readonly _userService: UserService,
    private readonly _firebaseService: FirebaseService,
    private readonly _houseRepository: HouseRepository,
  ) {}

  private _reminderNotifications() {
    const sendReminder = inngest.createFunction(
      { id: "send-daily-reminder" },
      {
        event: "command.user.send-reminder",
      },
      async ({ event }) => {
        const { userId, week } = event.data;
        const user = await this._userService.get(userId);
        if (isNil(user)) return;

        const assignments = await this._assignmentRepository.findMany({
          where: {
            userId,
            week,
            completed: false,
          },
          select: { chore: { select: { name: true } } },
        });
        return this._firebaseService.sendNotification({
          deviceTokens: user.appMetadata.deviceTokens,
          notification: {
            title: "You have incomplete chores",
            body: assignments.map(a => a.chore.name).join("\n"),
          },
        });
      },
    );

    const initiateDailyReminders = inngest.createFunction(
      { id: "initiate-dailyReminders", name: "Initiate daily reminders" },
      // everyday at 9am
      { cron: "0 9 * * *" },
      async ({ step }) => {
        const houses = await step.run("find houses", () =>
          this._houseRepository.findMany({
            select: { id: true, memberIds: true, week: true },
          }),
        );

        await Promise.all(
          houses.flatMap(house =>
            house.memberIds.map(userId =>
              step.invoke("Send reminder notification", {
                function: sendReminder,
                data: { week: house.week, userId },
              }),
            ),
          ),
        );
      },
    );

    return [sendReminder, initiateDailyReminders];
  }

  getFunctions() {
    return [
      ...this._reminderNotifications(),
      inngest.createFunction(
        {
          id: "assign-new-chore",
          name: "Assign New Chore",
        },
        { event: "chore.created" },
        async ({ event, step }) => {
          await step.run("assign chore", () =>
            this._assignmentService.assignChore(event.data.id),
          );
        },
      ),
      inngest.createFunction(
        { id: "notify-user-of-moved-tasks" },
        { event: "assignments.reassigned" },
        async ({ event, step }) => {
          const { fromUserId, toUserId, assignmentIds } = event.data;

          const fromName = await step.run("Get from user name", async () => {
            const user = await this._userService.get(fromUserId);
            return user?.nickname ?? user?.name ?? "Someone";
          });
          const choreNames = await step.run("Get chore names", async () => {
            const chores = await this._choreRepository.findMany({
              where: {
                Assignment: { some: { id: { in: assignmentIds } } },
              },
              select: {
                name: true,
              },
            });
            return chores.map(c => c.name);
          });
          const deviceTokens = await step.run("Get device tokens", async () => {
            const user = await this._userService.get(toUserId);
            return user?.appMetadata.deviceTokens;
          });

          if (isNil(deviceTokens) || isEmpty(deviceTokens)) return;

          await step.run("Send notification", () =>
            this._firebaseService.sendNotification({
              deviceTokens,
              notification: {
                title: `${fromName} gave you ${
                  choreNames.length === 1 ? "a chore" : "chores"
                }`,
                body: choreNames.join("\n"),
              },
            }),
          );
        },
      ),
      inngest.createFunction(
        { id: "notify-house-of-chores-due-today" },
        { event: "notifications.house.chores-due" },
        async ({ step, event }) => {
          const assignmentsPerUserId = await step.run(
            "Find assignments",
            async () => {
              const assignmentsDueToday =
                await this._assignmentService.findDueToday(event.data.houseId);
              return groupBy(assignmentsDueToday, "userId");
            },
          );

          await Promise.all(
            Object.entries(assignmentsPerUserId).map(
              async ([userId, assignments]) =>
                step.run(`Send for ${userId}`, async () => {
                  const user = await this._userService.get(userId);
                  if (isNil(user)) return;

                  const choreNames = await this._choreRepository.findMany({
                    where: {
                      id: { in: assignments.map(a => a.choreId) },
                    },
                    select: { name: true },
                  });
                  return this._firebaseService.sendNotification({
                    deviceTokens: user.appMetadata.deviceTokens,
                    notification: {
                      title: "Chores due today",
                      body: choreNames.join("\n"),
                    },
                  });
                }),
            ),
          );
        },
      ),
      inngest.createFunction(
        {
          id: "prepare-chores-due-for-the-day",
          name: "Prepare chores due for the day",
          retries: 10,
        },
        { cron: "TZ=America/New_York 0 8 * * *" },
        async ({ step }) => {
          const houseIds = await step.run("Get house ids", async () =>
            this._houseRepository.list({}, { id: true }),
          );
          await step.sendEvent(
            "send-per-house-events",
            houseIds.map(({ id }) => ({
              name: "notifications.house.chores-due",
              data: { houseId: id },
            })),
          );
        },
      ),
      inngest.createFunction(
        {
          id: "assign-chores-in-house",
          name: "Weekly: Assign chores in house",
        },
        { event: "command.house.assign-for-week" },
        async ({ event, step }) => {
          const { houseId } = event.data;

          const house = await step.run("Get house", () =>
            this._houseRepository.get(houseId),
          );
          if (isNil(house)) throw new NonRetriableError("House not found");

          const lastWeek = house.week;
          const week = lastWeek + 1;

          const previousAssignments = await step.run(
            "Find previous assignments",
            async () =>
              this._assignmentService.findForWeek({
                houseId,
                week: lastWeek,
              }),
          );

          await step.run("Assign penalties", async () => {
            const incompleteAssignments = previousAssignments.filter(
              a => !a.completed,
            );
            await this._assignmentService.createMany(
              incompleteAssignments.map(a => ({
                userId: a.userId,
                choreId: a.choreId,
                isPenalty: true,
                houseId,
                week,
              })),
            );
          });

          const chores = await step.run("Find chores for this week", () =>
            this._choreService.findUnassignedChores({ houseId, week }),
          );
          await step.run("Assign designated chores", async () => {
            const designatedChores = chores.filter(c =>
              isPresent(c.designatedUserId),
            );
            return await this._assignmentService.createMany(
              designatedChores.map(c => ({
                houseId,
                week,
                choreId: c.id,
                userId: c.designatedUserId!,
                isPenalty: false,
              })),
            );
          });

          const remainingChores = await step.run("Find remaining chores", () =>
            this._choreService.findUnassignedChores({ houseId, week }),
          );

          await step.run("Assign remaining chores", async () => {
            for (const chore of remainingChores) {
              const currentAssignments =
                await this._assignmentService.findForWeek({
                  houseId,
                  week,
                  isPenalty: false,
                  chore: { designatedUserId: null },
                });
              const lastAssignment =
                await this._assignmentService.findLatestForChore({
                  choreId: chore.id,
                  houseId,
                });
              const idsToCount = toRecord(
                house.memberIds,
                id => currentAssignments.filter(a => a.userId === id).length,
              );

              let assignee = this._assignmentService.getNextAssignee({
                choreId: chore.id,
                skip: lastAssignment?.userId,
                idsToCount,
              });
              if (isNil(assignee)) assignee = shuffle(house.memberIds)[0];

              await this._assignmentService.createMany([
                {
                  houseId,
                  week,
                  choreId: chore.id,
                  userId: assignee,
                  isPenalty: false,
                },
              ]);
            }
          });

          await step.run("Update week for house", () =>
            this._houseRepository.update(houseId, {
              week,
            }),
          );
        },
      ),
      inngest.createFunction(
        { id: "weekly-assign-chores", name: "Weekly: Assign Chores" },
        // every sunday at 8pm
        { cron: "TZ=America/New_York 00 20 * * 0" },
        async ({ step }) => {
          const houseIds = await step.run("Get all houses", () => {
            return this._houseRepository.list(
              { paused: { not: true } },
              { id: true },
            );
          });

          const events = houseIds.map(house => ({
            name: "command.house.assign-for-week",
            data: {
              houseId: house.id,
            },
          }));

          // @ts-ignore the schema for RangerEvent is not flexible
          await step.sendEvent("Send events for each house", events);
        },
      ),
      inngest.createFunction(
        { id: "house-deleted", name: "On House Deleted" },
        { event: "house.deleted" },
        async ({ event, step }) => {
          await step.run("Delete users", async () => {
            await Promise.all(
              event.data.memberIds.map(id => this._userService.delete(id)),
            );
          });
        },
      ),
    ];
  }
}

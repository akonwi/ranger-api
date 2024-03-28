import { Injectable, Logger } from "@nestjs/common";
import { inngest } from "./inngest.provider";
import { AssignmentService } from "src/assignments/assignment.service";
import { UserService } from "src/users/user.service";
import { FirebaseService } from "src/firebase.service";
import { ChoreRepository } from "src/chores/chore.repository";
import { HouseRepository } from "src/houses/house.repository";
import { groupBy, shuffle } from "lodash";
import { ChoreService } from "src/chores/chore.service";
import { isNil, isPresent, toRecord } from "src/utils";
import { NonRetriableError } from "inngest";

@Injectable()
export class FunctionService {
  private readonly _logger = new Logger(FunctionService.name);

  constructor(
    private readonly _assignmentService: AssignmentService,
    private readonly _choreRepository: ChoreRepository,
    private readonly _choreService: ChoreService,
    private readonly _userService: UserService,
    private readonly _firebaseService: FirebaseService,
    private readonly _houseRepository: HouseRepository,
  ) {}

  getFunctions() {
    return [
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
            const chores = await this._choreRepository.list(
              {
                Assignment: { some: { id: { in: assignmentIds } } },
              },
              {
                select: {
                  name: true,
                },
              },
            );
            return chores.map(c => c.name);
          });
          const deviceTokens = await step.run("Get device tokens", async () => {
            const user = await this._userService.get(toUserId);
            return user?.appMetadata.deviceTokens;
          });

          if (deviceTokens.length === 0) return;

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
                  const choreNames = await this._choreRepository.list(
                    {
                      id: { in: assignments.map(a => a.choreId) },
                    },
                    { select: { name: true } },
                  );
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
              this._assignmentService.find({
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
                userId: c.designatedUserId,
                isPenalty: false,
              })),
            );
          });

          const remainingChores = await step.run("Find remaining chores", () =>
            this._choreService.findUnassignedChores({ houseId, week }),
          );

          await step.run("Assign remaining chores", async () => {
            for (const chore of remainingChores) {
              const currentAssignments = await this._assignmentService.find({
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
    ];
  }
}

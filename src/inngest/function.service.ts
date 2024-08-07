import { Injectable } from "@nestjs/common";
import { inngest } from "./inngest.provider";
import { AssignmentService } from "../assignments/assignment.service";
import { UserService } from "../users/user.service";
import { FirebaseService } from "../firebase.service";
import { ChoreRepository } from "../chores/chore.repository";
import { HouseRepository } from "../houses/house.repository";
import { groupBy } from "lodash";
import { isEmpty, isNil } from "../utils";
import { NonRetriableError } from "inngest";
import { AssignmentRepository } from "../assignments/assignment.repository";

@Injectable()
export class FunctionService {
  constructor(
    private readonly _assignmentService: AssignmentService,
    private readonly _assignmentRepository: AssignmentRepository,
    private readonly _choreRepository: ChoreRepository,
    private readonly _userService: UserService,
    private readonly _firebaseService: FirebaseService,
    private readonly _houseRepository: HouseRepository,
  ) {}

  private async _sendNotification(input: {
    userId: string;
    notification: {
      title: string;
      body: string;
    };
  }) {
    const user = await this._userService.get(input.userId);
    if (isNil(user)) return;

    const deviceTokens = user.appMetadata.deviceTokens;

    if (isNil(deviceTokens) || isEmpty(deviceTokens)) return;

    const { invalidTokens } = await this._firebaseService.sendNotification({
      deviceTokens,
      notification: input.notification,
    });

    if (!isEmpty(invalidTokens)) {
      await this._userService.removeDeviceTokens(input.userId, invalidTokens);
    }
    return;
  }

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
      { cron: "TZ=America/New_York 0 9 * * *" },
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
          // await step.run("assign chore", () =>
          //   this._assignmentService.assignChore(event.data.id),
          // );
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

          let title: string;
          if (event.data.asPenalty) {
            title = `You have a penalty for unfinished chores`;
          } else {
            title = `${fromName} gave you ${
              choreNames.length === 1 ? "a chore" : "chores"
            }`;
          }

          await step.run("Send notification", () =>
            this._firebaseService.sendNotification({
              deviceTokens,
              notification: {
                title,
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
                await this._assignmentService.findDueToday({
                  houseId: event.data.houseId,
                  week: event.data.week,
                });
              return groupBy(assignmentsDueToday, "userId");
            },
          );

          await Promise.all(
            Object.entries(assignmentsPerUserId).map(
              async ([userId, assignments]) =>
                step.run(`Send for ${userId}`, async () => {
                  const user = await this._userService.get(userId);
                  if (isNil(user)) return;

                  const chores = await this._choreRepository.findMany({
                    where: {
                      id: { in: assignments.map(a => a.choreId) },
                    },
                    select: { name: true },
                  });
                  return this._firebaseService.sendNotification({
                    deviceTokens: user.appMetadata.deviceTokens,
                    notification: {
                      title: "Chores due today",
                      body: chores.map(c => c.name).join("\n"),
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
          const houses = await step.run("Get house ids", async () =>
            this._houseRepository.findMany({
              select: { id: true, week: true },
            }),
          );
          await step.sendEvent(
            "send-per-house-events",
            houses.map(({ id, week }) => ({
              name: "notifications.house.chores-due",
              data: { houseId: id, week },
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
            this._houseRepository.find({
              where: { id: houseId },
            }),
          );
          if (isNil(house)) throw new NonRetriableError("House not found");

          const lastWeek = house.week;
          const week = lastWeek + 1;

          const penalties = await step.run("Assign penalties", async () =>
            this._assignmentService.assignPenalties(houseId, week),
          );
          await step.run("Assign designated chores", async () =>
            this._assignmentService.assignDesignatedChores(houseId, week),
          );

          await step.run("Assign remaining chores", async () =>
            this._assignmentService.assignChores(houseId, week),
          );

          await step.run("Update week for house", () =>
            this._houseRepository.update(houseId, {
              week,
            }),
          );

          if (house.manualPenaltiesEnabled && penalties.length > 0) {
            await step.run(
              "Send notification for possible additional penalty",
              async () => {
                const usersWithPenalties = new Set(
                  penalties.map(p => p.userId),
                );
                const winnerId = house.memberIds.find(
                  userId => !usersWithPenalties.has(userId),
                );
                if (winnerId == null) return;

                const loser = await this._userService.get(penalties[0].userId);
                if (isNil(loser)) throw new NonRetriableError("User not found");

                await this._sendNotification({
                  userId: winnerId,
                  notification: {
                    title: "You can assign a penalty",
                    body: `${loser.nickname} did not complete their chores last week.`,
                  },
                });
              },
            );
          }
        },
      ),
      inngest.createFunction(
        { id: "weekly-assign-chores", name: "Weekly: Assign Chores" },
        // every sunday at 11pm
        { cron: "TZ=America/New_York 00 23 * * 0" },
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

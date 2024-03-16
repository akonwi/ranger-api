import { Injectable, Logger } from "@nestjs/common";
import { inngest } from "./inngest.provider";
import { AssignmentService } from "src/assignments/assignment.service";
import { UserService } from "src/users/user.service";
import { FirebaseService } from "src/firebase.service";
import { ChoreRepository } from "src/chores/chore.repository";
import { HouseRepository } from "src/houses/house.repository";
import { groupBy } from "lodash";

@Injectable()
export class FunctionService {
  private readonly _logger = new Logger(FunctionService.name);

  constructor(
    private readonly _assignmentService: AssignmentService,
    private readonly _choreRepository: ChoreRepository,
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
                name: true,
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
                    { name: true },
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
            // @ts-expect-error type matching sucks
            houseIds.map(houseId => ({
              name: "notifications.house.chores-due",
              data: { houseId },
            })),
          );
        },
      ),
      // TODO: weekly assignments
    ];
  }
}

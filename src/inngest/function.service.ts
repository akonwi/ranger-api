import { Injectable, Logger } from "@nestjs/common";
import { inngest } from "./inngest.provider";
import { AssignmentService } from "src/assignments/assignment.service";
import { UserService } from "src/users/user.service";
import { FirebaseService } from "src/firebase.service";
import { ChoreRepository } from "src/chores/chore.repository";

@Injectable()
export class FunctionService {
  private readonly _logger = new Logger(FunctionService.name);

  constructor(
    private readonly _assignmentService: AssignmentService,
    private readonly _choreRepository: ChoreRepository,
    private readonly _userService: UserService,
    private readonly _firebaseService: FirebaseService,
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
    ];
  }
}

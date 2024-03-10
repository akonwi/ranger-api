import { Injectable, Logger } from "@nestjs/common";
import { inngest } from "./inngest.provider";
import { AssignmentService } from "src/assignments/assignment.service";

@Injectable()
export class FunctionService {
  private readonly _logger = new Logger(FunctionService.name);

  constructor(private readonly _assignmentService: AssignmentService) {}

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
    ];
  }
}

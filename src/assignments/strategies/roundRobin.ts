import { shuffle } from "lodash";
import { Chore } from "../../chores/chore.model";
import { isNil, toRecord } from "../../utils";
import { AssignmentService } from "../assignment.service";

export type StrategyOptions = {
  houseId: string;
  members: string[];
  chores: Chore[];
};

export type StrategyResult = {
  [userId: string]: Array<{
    week: number;
    choreId: string;
    userId: string;
    houseId: string;
    isPenalty: boolean;
  }>;
};

export class RoundRobinStrategy {
  constructor(
    private readonly _assignmentService: AssignmentService,
    private readonly _options: StrategyOptions,
  ) {}

  async apply(week: number): Promise<StrategyResult> {
    const { members, chores, houseId } = this._options;
    const usersToAssignments: StrategyResult = toRecord(members, _ => []);
    // const currentAssignments = await assignmentService.findForWeek({
    //   houseId,
    //   week,
    //   isPenalty: false,
    //   chore: { designatedUserId: null },
    // });
    const idsToCount = toRecord(members, _ => 0);
    for (const chore of chores) {
      const lastAssignment = await this._assignmentService.findLatestForChore({
        choreId: chore.id,
        houseId,
      });

      let assignee = this._assignmentService.getNextAssignee({
        choreId: chore.id,
        skip: lastAssignment?.userId,
        idsToCount,
      });
      if (isNil(assignee)) assignee = shuffle(members)[0];

      usersToAssignments[assignee].push({
        week,
        houseId,
        choreId: chore.id,
        userId: assignee,
        isPenalty: false,
      });
    }

    return usersToAssignments;
  }
}

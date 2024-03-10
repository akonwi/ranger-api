import { Injectable } from "@nestjs/common";
import { orderBy } from "lodash";
import { Assignment } from "./assignment.model";
import { ChoreRepository } from "src/chores/chore.repository";
import { HouseRepository } from "src/houses/house.repository";
import { AssignmentRepository } from "./assignment.repository";
import { Maybe, isNil, isPresent } from "src/utils";
import { House } from "src/houses/house.model";

@Injectable()
export class AssignmentService {
  constructor(
    private readonly _assignmentRepository: AssignmentRepository,
    private readonly _choreRepository: ChoreRepository,
    private readonly _houseRepository: HouseRepository,
  ) {}

  async assignChore(choreId: string): Promise<Assignment> {
    const chore = await this._choreRepository.get(choreId);
    if (chore == null) throw new Error("Chore not found");

    const house = await this._houseRepository.get(chore.houseId);

    if (house == null) throw new Error("House not found");

    if (isPresent(chore.designatedUserId)) {
      return this._assignmentRepository.create({
        house: {
          connect: { id: house.id },
        },
        chore: { connect: { id: choreId } },
        userId: chore.designatedUserId,
        week: house.week,
      });
    }

    const userToCounts = await this._getAssignmentCounts(house);

    const nextAssignee = this._getNextAssignee({
      choreId,
      idsToCount: userToCounts,
    });

    if (isNil(nextAssignee)) throw new Error("No eligible assignees found");

    return this._assignmentRepository.create({
      house: {
        connect: { id: house.id },
      },
      chore: { connect: { id: choreId } },
      userId: nextAssignee,
      week: house.week,
    });
  }

  private _getNextAssignee(options: {
    choreId: string;
    skip?: string;
    idsToCount: Record<string, number>;
  }): Maybe<string> {
    const { idsToCount } = options;

    if (Object.keys(idsToCount).length === 0) return null;

    const entries = Object.entries(options.idsToCount).filter(
      ([key]) => key !== options.skip,
    );

    return orderBy(entries, ([_, value]) => value, "desc")[0][0];
  }

  private async _getAssignmentCounts(
    house: House,
  ): Promise<{ [memberId: string]: number }> {
    const userToCounts: { [memberId: string]: number } = {};
    for await (const userId of house.memberIds) {
      const count = await this._assignmentRepository.count({
        houseId: house.id,
        week: house.week,
        userId,
        isPenalty: false,
      });
      userToCounts[userId] = count;
    }
    return userToCounts;
  }
}

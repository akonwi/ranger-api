import { Injectable } from "@nestjs/common";
import { ChoreRepository } from "./chore.repository";
import { Chore } from "./chore.model";
import { Frequency } from "@prisma/client";
import { insist } from "src/utils";

@Injectable()
export class ChoreService {
  constructor(private readonly _choreRepository: ChoreRepository) {}

  async findUnassignedChores(input: { houseId: string; week: number }): Promise<
    Chore[]
  > {
    // chores that are not assigned yet or are not penalties this week
    const chores = await this._choreRepository.findUnassignedChores(input);

    return chores.filter(chore =>
      this._isFrequencySatisfied({
        chore,
        lastCompletedWeek: chore.Assignment[0]?.week ?? 0,
        currentWeek: input.week,
      }),
    );
  }

  private _isFrequencySatisfied(input: {
    chore: Chore;
    lastCompletedWeek: number;
    currentWeek: number;
  }): boolean {
    const { chore, currentWeek, lastCompletedWeek } = input;

    switch (chore.frequency) {
      case Frequency.MONTHLY:
        return currentWeek - lastCompletedWeek >= 4;
      case Frequency.ANNUALLY:
        return currentWeek - lastCompletedWeek >= 52;
      case Frequency.CUSTOM: {
        const customFrequency = insist(
          chore.customFrequency,
          `chore ${chore.id} has custom frequency but no customFrequency value`,
        );
        const daysSinceLastAssignment = (currentWeek - lastCompletedWeek) * 7;
        return daysSinceLastAssignment >= customFrequency;
      }
      default:
        return true;
    }
  }
}

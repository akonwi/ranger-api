import { Injectable } from "@nestjs/common";
import { ChoreRepository } from "./chore.repository";
import { Chore } from "./chore.model";
import { Frequency } from "@prisma/client";
import { Result, insist, isPresent, notOK, ok } from "src/utils";
import { inngest } from "src/inngest/inngest.provider";

type ChoreValidationError = {
  code: "VALIDATION_ERROR";
  path: string;
  message: string;
};

@Injectable()
export class ChoreService {
  constructor(private readonly _choreRepository: ChoreRepository) {}

  async create(input: {
    name: string;
    description: string;
    cadence:
      | { frequency: typeof Frequency.CUSTOM; days: number }
      | { frequency: Frequency };
    creatorId: string;
    houseId: string;
  }): Promise<Result<Chore, ChoreValidationError>> {
    const name = input.name.trim();
    const existingChore = await this._choreRepository.findFirst({
      where: { name: { mode: "insensitive", equals: name } },
    });
    if (isPresent(existingChore))
      return notOK({
        code: "VALIDATION_ERROR",
        path: "input.name",
        message: "Name must be unique",
      });

    const chore = await this._choreRepository.create({
      name: name,
      description: input.description,
      frequency: input.cadence.frequency,
      customFrequency: "days" in input.cadence ? input.cadence.days : null,
      creatorId: input.creatorId,
      house: {
        connect: {
          id: input.houseId,
        },
      },
    });

    await inngest.send({
      name: "chore.created",
      data: {
        houseId: chore.houseId,
        id: chore.id,
      },
    });

    return ok(chore);
  }

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

  async delete(input: { houseId: string; id: string }): Promise<Chore> {
    const chore = await this._choreRepository.update({
      id: input.id,
      deletedAt: new Date(),
    });
    await inngest.send({
      name: "chore.deleted",
      data: input,
    });
    return chore;
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

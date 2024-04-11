import { Injectable } from "@nestjs/common";
import { ChoreRepository } from "./chore.repository";
import { Chore } from "./chore.model";
import { Frequency } from "@prisma/client";
import { insist, isNil, isPresent } from "src/utils";
import { inngest } from "src/inngest/inngest.provider";

export type CreateChoreInput = {
  creatorId: string;
  houseId: string;
  name?: string;
  description?: string;
  designatedUserId?: string;
  cadence?: {
    frequency: Frequency;
    days?: number;
  };
  dayOfWeek?: number;
};

@Injectable()
export class ChoreService {
  constructor(private readonly _choreRepository: ChoreRepository) {}

  async create(input: CreateChoreInput): Promise<Chore> {
    if (input.cadence.frequency === Frequency.CUSTOM) {
      if (isNil(input.cadence.days)) {
        throw new Error("A custom frequency must have a 'days' value");
      }
    }

    const chore = await this._choreRepository.create({
      name: input.name,
      description: input.description,
      frequency: input.cadence?.frequency,
      customFrequency: input.cadence?.days,
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
        houseId: input.houseId,
        id: chore.id,
      },
    });

    return chore;
  }

  async createLinks({
    rootId,
    children,
  }: {
    rootId: string;
    children: string[];
  }): Promise<Chore> {
    const chores = await this._choreRepository.list({
      id: { in: [rootId, ...children] },
    });

    chores.forEach(chore => {
      if (chore.id !== rootId && isPresent(chore.rootId)) {
        throw new Error("A requested child already has a parent");
      }
    });

    return this._choreRepository.update({
      id: rootId,
      links: {
        connect: children.map(id => ({ id, AND: { rootId: null } })),
      },
    });
  }

  async removeLinks({
    rootId,
    children,
  }: {
    rootId: string;
    children: string[];
  }): Promise<Chore> {
    return this._choreRepository.update({
      id: rootId,
      links: {
        disconnect: children.map(id => ({ id })),
      },
    });
  }

  async listChildren(rootId: string): Promise<Chore[]> {
    return this._choreRepository.list({ rootId });
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

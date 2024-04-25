import { Injectable } from "@nestjs/common";
import { orderBy } from "lodash";
import { Assignment } from "./assignment.model";
import { ChoreRepository } from "src/chores/chore.repository";
import { HouseRepository } from "src/houses/house.repository";
import { AssignmentRepository } from "./assignment.repository";
import {
  Maybe,
  indexBy,
  insist,
  isEmpty,
  isNil,
  isPresent,
  keys,
  prune,
  toRecord,
} from "src/utils";
import { House } from "src/houses/house.model";
import { inngest } from "src/inngest/inngest.provider";

@Injectable()
export class AssignmentService {
  constructor(
    private readonly _assignmentRepository: AssignmentRepository,
    private readonly _choreRepository: ChoreRepository,
    private readonly _houseRepository: HouseRepository,
  ) {}

  async getPerMember(house: House): Promise<Record<string, Assignment[]>> {
    const memberAssignments = await this._assignmentRepository.getPerMember({
      houseId: house.id,
      week: house.week,
    });

    if (!isEmpty(Object.keys(memberAssignments))) {
      return memberAssignments;
    }

    return toRecord(house.memberIds, _ => []);
  }

  async setStatus(id: string, completed: boolean): Promise<Assignment> {
    return this._assignmentRepository.update(id, { completed });
  }

  async reassign(input: {
    fromUserId: string;
    toUserId: string;
    ids: string[];
  }): Promise<Assignment[]> {
    const assignments = await Promise.all(
      input.ids.map(async id =>
        this._assignmentRepository.update(id, { userId: input.toUserId }),
      ),
    );
    inngest.send({
      name: "assignments.reassigned",
      data: {
        toUserId: input.toUserId,
        fromUserId: input.fromUserId,
        assignmentIds: input.ids,
      },
    });
    return assignments;
  }

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

    const nextAssignee = this.getNextAssignee({
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

  async createMany(inputs: Parameters<AssignmentRepository["createMany"]>[0]) {
    return this._assignmentRepository.createMany(inputs);
  }

  async assignPenalties({
    houseId,
    week,
  }: { houseId: string; week: number }): Promise<void> {
    const incompletes = await this.find({
      houseId,
      week: week - 1,
    });
    await this._assignmentRepository.createMany({
      data: incompletes.map(i => ({
        userId: i.userId,
        choreId: i.choreId,
        isPenalty: true,
        houseId,
        week,
      })),
    });
  }

  async assignPenaltyLinks({
    houseId,
    week,
  }: { houseId: string; week: number }) {
    const penaltiesWithLinks = await this._assignmentRepository.findMany({
      where: {
        week,
        isPenalty: true,
        chore: {
          links: { some: {} },
        },
      },
      include: {
        chore: {
          select: {
            links: {
              select: { id: true },
            },
          },
        },
      },
    });
    const penaltiesByChoreId = indexBy(penaltiesWithLinks, "choreId");

    const linksToAssign = await this._choreRepository.findUnassignedChores({
      week,
      houseId,
      ids: penaltiesWithLinks.flatMap(p => p.chore.links.map(l => l.id)),
    });
    await this._assignmentRepository.createMany({
      data: linksToAssign.map(l => ({
        userId: insist(penaltiesByChoreId.get(l.rootId!)).userId,
        houseId: l.houseId,
        choreId: l.id,
        penalty: true,
        week,
      })),
    });
  }

  async assignPenaltyRoots({
    houseId,
    week,
  }: { houseId: string; week: number }) {
    const penaltiesWithRoots = await this._assignmentRepository.findMany({
      where: {
        week,
        isPenalty: true,
        chore: {
          rootId: { not: null },
        },
      },
      include: {
        chore: {
          select: {
            rootId: true,
          },
        },
      },
    });
    const penaltiesByChoreId = indexBy(penaltiesWithRoots, "choreId");

    const rootsToAssign = await this._choreRepository.findUnassignedChores({
      week,
      houseId,
      ids: prune(penaltiesWithRoots.map(p => p.chore.rootId)),
    });
    await this._assignmentRepository.createMany({
      data: rootsToAssign.map(root => ({
        userId: insist(penaltiesByChoreId.get(root.id)).userId,
        houseId: root.houseId,
        choreId: root.id,
        penalty: true,
        week,
      })),
    });
  }

  async find(
    where: Parameters<AssignmentRepository["list"]>[0] & {
      houseId: string;
    },
  ): Promise<Assignment[]> {
    return this._assignmentRepository.findMany({ where });
  }

  async findLatestForChore(input: { choreId: string; houseId: string }) {
    return this._assignmentRepository.findLatestForChore(input);
  }

  async findDueToday(houseId: string): Promise<Assignment[]> {
    return this._assignmentRepository.list({
      where: {
        houseId,
        completed: false,
        chore: { day: new Date().getDay() },
      },
    });
  }

  getNextAssignee(options: {
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

  async getHistory(input: {
    choreId: string;
    houseId: string;
    cursor?: string;
  }): Promise<Assignment[]> {
    return this._assignmentRepository.list({
      where: {
        choreId: input.choreId,
        houseId: input.houseId,
      },
      orderBy: { week: "desc" },
      // use the cursor to get the next page
      cursor: isPresent(input.cursor) ? { id: input.cursor } : undefined,
      // omit the first result since it's the cursor
      skip: 1,
      take: 20,
    });
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

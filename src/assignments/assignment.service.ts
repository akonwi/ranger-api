import { Injectable } from "@nestjs/common";
import { orderBy } from "lodash";
import { Assignment } from "./assignment.model";
import { ChoreRepository } from "../chores/chore.repository";
import { HouseRepository } from "../houses/house.repository";
import { AssignmentRepository } from "./assignment.repository";
import { Maybe, isEmpty, isNil, isPresent, toRecord } from "../utils";
import { House } from "../houses/house.model";
import { inngest } from "../inngest/inngest.provider";
import { ChoreService } from "../chores/chore.service";
import { CircularLinkedList } from "../utils/circularLinkedList";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AssignmentService {
  constructor(
    private readonly _assignmentRepository: AssignmentRepository,
    private readonly _choreRepository: ChoreRepository,
    private readonly _choreService: ChoreService,
    private readonly _houseRepository: HouseRepository,
    private readonly _prisma: PrismaService,
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
    asPenalty?: boolean;
  }): Promise<Assignment[]> {
    const [id] = input.ids;
    const assignment = await this._assignmentRepository.find({
      where: { id },
      include: { chore: true },
    });
    if (isNil(assignment)) throw new Error("Assignment not found: " + id);
    // no-op if the fromUser is not the current assignee
    if (assignment.userId !== input.fromUserId) return [assignment];

    const updated = await this._prisma.$transaction(async tx => {
      const updated = await tx.assignment.update({
        where: { id: assignment!.id },
        data: {
          userId: input.toUserId,
          isReassigned: input.asPenalty ? false : true,
          isPenalty: input.asPenalty,
        },
        include: { chore: true },
      });

      /*
       * if this is the first time it's being reassigned,
       * nextAssignee needs to become the fromUser
       */
      if (!assignment!.isReassigned || input.asPenalty) return updated;

      // if this is another reassignment, and toUser is already next, swap with fromUser
      if (assignment!.chore.nextAssignee === input.toUserId) {
        await this._prisma.chore.update({
          where: { id: assignment!.choreId },
          data: { nextAssignee: input.fromUserId },
        });
      }
      // if assigning again to anyone else, don't change nextAssignee
      return updated;
    });

    inngest.send({
      name: "assignments.reassigned",
      data: {
        toUserId: input.toUserId,
        fromUserId: input.fromUserId,
        assignmentIds: [id],
        asPenalty: input.asPenalty ?? false,
      },
    });

    return [updated];
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

  async assignPenalties(houseId: string, week: number): Promise<Assignment[]> {
    const previousAssignments = await this._assignmentRepository.findMany({
      where: {
        houseId,
        week: week - 1,
      },
    });

    const createAssignmentInputs = previousAssignments
      .filter(a => a.completed !== true)
      .map(a => ({
        userId: a.userId,
        choreId: a.choreId,
        isPenalty: true,
        houseId,
        week,
      }));

    return this._assignmentRepository.createMany(createAssignmentInputs);
  }

  async assignDesignatedChores(
    houseId: string,
    week: number,
  ): Promise<Assignment[]> {
    const chores = await this._choreService.findUnassignedChores({
      houseId,
      week,
    });
    const designatedChores = chores.filter(c => isPresent(c.designatedUserId));
    return this._assignmentRepository.createMany(
      designatedChores.map(c => ({
        houseId,
        week,
        choreId: c.id,
        userId: c.designatedUserId!,
        isPenalty: false,
      })),
    );
  }

  async assignChores(houseId: string, week: number): Promise<Assignment[]> {
    const house = await this._houseRepository.get(houseId);
    if (isNil(house)) throw new Error("House not found");

    const list = CircularLinkedList.from(house.memberIds);

    const chores = await this._choreService.findUnassignedChores({
      houseId,
      week,
    });

    const assignmentInputs: Prisma.AssignmentCreateManyInput[] = [];
    const choreInputs: Prisma.ChoreUpdateArgs[] = [];
    for (const chore of chores) {
      let assignee = chore.nextAssignee;

      // if the next assignee isn't set, assign the next member in the list
      if (assignee == null) {
        const lastAssignment = await this.findLatestForChore({
          choreId: chore.id,
          houseId,
        });
        assignee =
          lastAssignment == null
            ? list.next()
            : list.nextAfter(lastAssignment.userId);
      }
      if (assignee == null) throw new Error("No eligible assignees found");

      assignmentInputs.push({
        week,
        houseId,
        choreId: chore.id,
        userId: assignee,
        isPenalty: false,
      });
      choreInputs.push({
        where: { id: chore.id },
        data: { nextAssignee: list.peek() },
      });
    }

    const results = await this._prisma.$transaction([
      ...assignmentInputs.map(input =>
        this._prisma.assignment.create({ data: input }),
      ),
      ...choreInputs.map(input => this._prisma.chore.update(input)),
    ]);

    return results.slice(0, assignmentInputs.length) as Assignment[];
  }

  async createMany(inputs: Parameters<AssignmentRepository["createMany"]>[0]) {
    return this._assignmentRepository.createMany(inputs);
  }

  async findForWeek(input: {
    houseId: string;
    week: number;
    isPenalty?: boolean;
    chore?: {
      designatedUserId?: Maybe<string>;
    };
  }): Promise<Assignment[]> {
    return this._assignmentRepository.list({ where: input });
  }

  async findLatestForChore(input: { choreId: string; houseId: string }) {
    return this._assignmentRepository.findLatestForChore(input);
  }

  async findDueToday(input: { houseId: string; week: number }): Promise<
    Assignment[]
  > {
    const { houseId, week } = input;
    return this._assignmentRepository.list({
      where: {
        houseId,
        week,
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

import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { Assignment } from "./assignment.model";
import { groupBy } from "lodash";
import { Maybe } from "../utils";

@Injectable()
export class AssignmentRepository {
  constructor(private readonly _prisma: PrismaService) {}

  findMany = this._prisma.assignment.findMany;

  updateMany = this._prisma.assignment.updateMany;

  async list(
    options: Parameters<Prisma.AssignmentDelegate["findMany"]>[0],
  ): Promise<Assignment[]> {
    return this._prisma.assignment.findMany(options);
  }

  async getMany(ids: string[]): Promise<Assignment[]> {
    return this._prisma.assignment.findMany({ where: { id: { in: ids } } });
  }

  async create(input: Prisma.AssignmentCreateInput): Promise<Assignment> {
    return this._prisma.assignment.create({ data: input });
  }

  async createMany(inputs: Prisma.AssignmentCreateManyInput[]) {
    // todo: update prisma to be able to use createManyAndReturn
    return this._prisma.$transaction(
      inputs.map(input => this._prisma.assignment.create({ data: input })),
    );
  }

  async findLatestForChore(input: {
    choreId: string;
    houseId: string;
  }): Promise<Maybe<Assignment>> {
    return this._prisma.assignment.findFirst({
      where: {
        choreId: input.choreId,
        houseId: input.houseId,
      },
      orderBy: { week: "desc" },
    });
  }

  async update(
    id: string,
    input: Pick<Prisma.AssignmentUpdateInput, "completed" | "userId">,
  ): Promise<Assignment> {
    return this._prisma.assignment.update({
      where: { id },
      data: input,
    });
  }

  async count(input: {
    houseId: string;
    userId: string;
    week: number;
    isPenalty: boolean;
  }): Promise<number> {
    return this._prisma.assignment.count({
      where: input,
    });
  }

  async getPerMember(input: { houseId: string; week: number }): Promise<
    Record<string, Assignment[]>
  > {
    const result = await this._prisma.assignment.findMany({
      where: {
        houseId: input.houseId,
        week: input.week,
      },
    });

    return groupBy(result, "userId");
  }
}

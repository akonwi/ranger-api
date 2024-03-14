import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma.service";
import { Assignment } from "./assignment.model";
import { groupBy } from "lodash";

@Injectable()
export class AssignmentRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async getMany(ids: string[]): Promise<Assignment[]> {
    return this._prisma.assignment.findMany({ where: { id: { in: ids } } });
  }

  async create(input: Prisma.AssignmentCreateInput): Promise<Assignment> {
    return this._prisma.assignment.create({ data: input });
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

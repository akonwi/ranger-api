import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma.service";
import { Assignment } from "./assignment.model";

@Injectable()
export class AssignmentRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async create(input: Prisma.AssignmentCreateInput): Promise<Assignment> {
    return this._prisma.assignment.create({ data: input });
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
}

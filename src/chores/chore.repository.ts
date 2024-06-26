import { Injectable } from "@nestjs/common";
import { Chore, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { Maybe } from "../utils";

@Injectable()
export class ChoreRepository {
  constructor(private readonly _prisma: PrismaService) {}

  readonly findFirst = this._prisma.chore.findFirst;
  readonly findMany = this._prisma.chore.findMany;

  async get(id: string): Promise<Maybe<Chore>> {
    return this._prisma.chore.findUnique({ where: { id } });
  }

  async create(input: Prisma.ChoreCreateInput): Promise<Chore> {
    return this._prisma.chore.create({ data: input });
  }

  async update(
    input: Prisma.ChoreUpdateInput & { id: string },
  ): Promise<Chore> {
    return this._prisma.chore.update({
      where: { id: input.id },
      data: input,
    });
  }

  async findUnassignedChores(input: { houseId: string; week: number }) {
    // chores that are not assigned yet or are not penalties this week
    return this._prisma.chore.findMany({
      where: {
        houseId: input.houseId,
        OR: [
          {
            Assignment: { none: {} },
          },
          { Assignment: { none: { week: input.week, isPenalty: true } } },
        ],
      },
      include: { Assignment: { orderBy: { week: "desc" }, take: 1 } },
    });
  }
}

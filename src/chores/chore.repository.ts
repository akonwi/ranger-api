import { Injectable } from "@nestjs/common";
import { Chore, Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma.service";
import { Maybe } from "src/utils";

@Injectable()
export class ChoreRepository {
  constructor(private readonly _prisma: PrismaService) {}

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

  async list(
    where: Prisma.ChoreWhereInput,
    select?: Prisma.ChoreSelect,
  ): Promise<Chore[]> {
    return this._prisma.chore.findMany({ where, select });
  }
}

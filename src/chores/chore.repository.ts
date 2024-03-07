import { Injectable } from "@nestjs/common";
import { Chore, Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class ChoreRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async create(input: Prisma.ChoreCreateInput): Promise<Chore> {
    return this._prisma.chore.create({ data: input });
  }
}

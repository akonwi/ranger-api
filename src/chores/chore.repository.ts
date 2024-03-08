import { Injectable } from "@nestjs/common";
import { Chore, Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class ChoreRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async create(input: Prisma.ChoreCreateInput): Promise<Chore> {
    return this._prisma.chore.create({ data: input });
  }

  async update(
    input: Prisma.ChoreUpdateInput & { id: string },
  ): Promise<Chore> {
    return this._prisma.chore.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        designatedUserId: input.designatedUserId,
        frequency: input.frequency,
        customFrequency: input.customFrequency,
      },
    });
  }

  async list(input: { houseId: string }): Promise<Chore[]> {
    return this._prisma.chore.findMany({ where: input });
  }
}

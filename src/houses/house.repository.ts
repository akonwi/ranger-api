import { Injectable } from "@nestjs/common";
import { House } from "./house.model";
import { PrismaService } from "../prisma.service";
import { Maybe, isNil } from "../utils";
import { Prisma } from "@prisma/client";

@Injectable()
export class HouseRepository {
  constructor(private _prisma: PrismaService) {}

  async list(
    where: Prisma.HouseWhereInput,
    select?: Prisma.HouseSelect,
  ): Promise<House[]> {
    return this._prisma.house.findMany({ where, select });
  }

  async create(input: { name: string; creatorId: string }): Promise<House> {
    return this._prisma.house.create({
      data: {
        name: input.name,
        creatorId: input.creatorId,
        adminId: input.creatorId,
        memberIds: [input.creatorId],
      },
    });
  }

  async update(
    id: string,
    input: { week?: number; paused?: boolean },
  ): Promise<House> {
    return this._prisma.house.update({
      where: { id },
      data: input,
    });
  }

  async getForUser(userId: string): Promise<Maybe<House>> {
    return this._prisma.house.findFirst({
      where: { memberIds: { has: userId } },
    });
  }

  async get(id: string): Promise<Maybe<House>> {
    return this._prisma.house.findUnique({
      where: { id },
    });
  }

  async getInvites(houseId: string): Promise<string[]> {
    const house = await this._prisma.house.findUnique({
      where: { id: houseId },
      select: { invites: true },
    });

    if (isNil(house)) return [];

    return house.invites.map(invite => invite.email);
  }

  async createInvite(houseId: string, email: string): Promise<string> {
    const invite = await this._prisma.invite.create({
      data: {
        email,
        houseId,
      },
    });

    return invite.email;
  }

  async destroy(id: string): Promise<void> {
    await this._prisma.house.delete({ where: { id } });
  }
}

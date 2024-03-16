import { Injectable } from "@nestjs/common";
import { House } from "./house.model";
import { PrismaService } from "src/prisma.service";
import { Maybe, isNil } from "src/utils";

@Injectable()
export class HouseRepository {
  constructor(private _prisma: PrismaService) {}

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
}

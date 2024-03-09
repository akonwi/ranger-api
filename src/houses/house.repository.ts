import { Injectable } from "@nestjs/common";
import { House } from "./house.model";
import { PrismaService } from "src/prisma.service";
import { Maybe } from "src/utils";

@Injectable()
export class HouseRepository {
  constructor(private _prisma: PrismaService) {}

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
}

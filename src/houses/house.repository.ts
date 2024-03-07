import { Injectable } from "@nestjs/common";
import { House } from "@prisma/client";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class HouseRepository {
  constructor(private _prisma: PrismaService) {}

  async getForUser(userId: string): Promise<House | null> {
    return this._prisma.house.findFirst({
      where: { memberIds: { has: userId } },
    });
  }
}

import { Injectable } from "@nestjs/common";
import { HouseRepository } from "./house.repository";
import { inngest } from "../inngest/inngest.provider";
import { Maybe } from "../../src/utils";
import { House } from "./house.model";
import { UserService } from "../../src/users/user.service";

@Injectable()
export class HouseService {
  constructor(
    private readonly _houseRepository: HouseRepository,
    private readonly _userService: UserService,
  ) {}

  async getForUser(userId: string): Promise<Maybe<House>> {
    return this._houseRepository.getForUser(userId);
  }

  async maybeConfirmInvite(userId: string): Promise<Maybe<House>> {
    const user = await this._userService.get(userId);
    if (!user) return null;
    const house = await this._houseRepository.confirmInvite(
      user.id,
      user.email,
    );
    if (house) {
      await inngest.send({
        name: "house.updated.member-joined",
        data: { id: house.id, memberId: user.id },
      });
    }
    return house;
  }

  async destroy(id: string): Promise<void> {
    const house = await this._houseRepository.find({ where: { id } });
    if (!house) return;

    await this._houseRepository.destroy(id);

    await inngest.send({
      name: "house.deleted",
      data: { id, memberIds: house.memberIds },
    });
  }
}

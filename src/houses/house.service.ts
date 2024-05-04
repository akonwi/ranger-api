import { Injectable } from "@nestjs/common";
import { HouseRepository } from "./house.repository";
import { inngest } from "../inngest/inngest.provider";

@Injectable()
export class HouseService {
  constructor(private readonly _houseRepository: HouseRepository) {}

  async destroy(id: string): Promise<void> {
    const house = await this._houseRepository.find(id);
    if (!house) return;

    await this._houseRepository.destroy(id);

    await inngest.send({
      name: "house.deleted",
      data: { id, memberIds: house.memberIds },
    });
  }
}

import { Injectable } from "@nestjs/common";
import { HouseRepository } from "./house.repository";

@Injectable()
export class HouseService {
  constructor(private readonly _houseRepository: HouseRepository) {}

  async destroy(id: string): Promise<void> {
    await this._houseRepository.destroy(id);
  }
}

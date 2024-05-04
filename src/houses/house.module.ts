import { Module } from "@nestjs/common";
import { HouseRepository } from "./house.repository";
import { CommonModule } from "../common.module";
import { HouseService } from "./house.service";

@Module({
  imports: [CommonModule],
  providers: [HouseRepository, HouseService],
  exports: [HouseRepository, HouseService],
})
export class HouseModule {}

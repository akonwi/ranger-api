import { Module } from "@nestjs/common";
import { HouseRepository } from "./house.repository";
import { CommonModule } from "../common.module";

@Module({
  imports: [CommonModule],
  providers: [HouseRepository],
  exports: [HouseRepository],
})
export class HouseModule {}

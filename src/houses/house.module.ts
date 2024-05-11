import { Module } from "@nestjs/common";
import { HouseRepository } from "./house.repository";
import { CommonModule } from "../common.module";
import { HouseService } from "./house.service";
import { UserService } from "src/users/user.service";

@Module({
  imports: [CommonModule],
  providers: [HouseRepository, HouseService, UserService],
  exports: [HouseRepository, HouseService],
})
export class HouseModule {}

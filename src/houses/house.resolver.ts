import { Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { House } from "./house.model";
import { UserService } from "src/users/user.service";
import { Maybe } from "src/utils";
import { HouseRepository } from "./house.repository";
import { User } from "src/users/user.model";
import { CurrentUser, UserContext } from "src/auth/currentUser.decorator";

@Resolver(() => House)
export class HouseResolver {
  constructor(
    private readonly _houseRepository: HouseRepository,
    private readonly _userService: UserService,
  ) {}

  @ResolveField("members", () => [User])
  async getMembers(@Parent() house: House): Promise<User[]> {
    return this._userService.findMany(house.memberIds);
  }

  @Query(() => House, { name: "myHouse", nullable: true })
  async getMyHouse(@CurrentUser() user: UserContext): Promise<Maybe<House>> {
    return this._houseRepository.getForUser(user.id);
  }
}

import { Query, Resolver, ResolveField, Mutation, Args } from "@nestjs/graphql";
import { HouseRepository } from "src/houses/house.repository";
import { Viewer } from "./viewer.model";
import { CurrentUser, UserContext } from "src/auth/currentUser.decorator";
import { UserService } from "src/users/user.service";
import { House } from "src/houses/house.model";
import { Maybe } from "src/utils";

@Resolver(() => Viewer)
export class ViewerResolver {
  constructor(
    private readonly _houseRepository: HouseRepository,
    private readonly _userService: UserService,
  ) {}

  @Query(() => Viewer)
  async viewer(@CurrentUser() ctx: UserContext): Promise<Viewer> {
    return this._userService.get(ctx.id);
  }

  @ResolveField("house", () => House, { nullable: true })
  async getMyHouse(@CurrentUser() user: UserContext): Promise<Maybe<House>> {
    return this._houseRepository.getForUser(user.id);
  }

  @Mutation(() => Boolean)
  async saveDeviceToken(@Args("token") token: string) {
    // TODO
    return true;
  }
}

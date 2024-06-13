import { Query, Resolver, ResolveField, Mutation, Args } from "@nestjs/graphql";
import { Viewer } from "./viewer.model";
import { CurrentUser, UserContext } from "../auth/currentUser.decorator";
import { UserService } from "../users/user.service";
import { House } from "../houses/house.model";
import { Maybe } from "../utils";
import { HouseService } from "../houses/house.service";

@Resolver(() => Viewer)
export class ViewerResolver {
  constructor(
    private readonly _houseService: HouseService,
    private readonly _userService: UserService,
  ) {}

  @Query(() => Viewer, { nullable: true })
  async viewer(@CurrentUser() ctx: UserContext): Promise<Maybe<Viewer>> {
    return this._userService.get(ctx.id);
  }

  @ResolveField("house", () => House, { nullable: true })
  async getMyHouse(@CurrentUser() user: UserContext): Promise<Maybe<House>> {
    const house = await this._houseService.getForUser(user.id);
    if (house) return house;
    return this._houseService.maybeConfirmInvite(user.id);
  }

  @Mutation(() => Boolean)
  async saveDeviceToken(
    @CurrentUser() user: UserContext,
    @Args("token") token: string,
  ): Promise<boolean> {
    await this._userService.saveDeviceToken(user.id, token);
    return true;
  }
}

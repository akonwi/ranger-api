import { Query, Resolver, Mutation, Args } from "@nestjs/graphql";
import { Viewer } from "./viewer.model";
import { CurrentUser, UserContext } from "../auth/currentUser.decorator";
import { UserService } from "../users/user.service";
import { Maybe } from "../utils";

@Resolver(() => Viewer)
export class ViewerResolver {
  constructor(private readonly _userService: UserService) {}

  @Query(() => Viewer, { nullable: true })
  async viewer(@CurrentUser() ctx: UserContext): Promise<Maybe<Viewer>> {
    return this._userService.get(ctx.id);
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

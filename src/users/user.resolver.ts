import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { User } from "./user.model";
import { CurrentUser, UserContext } from "src/auth/currentUser.decorator";

@Resolver(() => User)
export class UserResolver {
  @ResolveField("isMe", () => Boolean)
  async isMe(@CurrentUser() userContext: UserContext, @Parent() user: User) {
    return user.id === userContext.id;
  }
}

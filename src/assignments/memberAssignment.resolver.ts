import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { MemberAssignment } from "./memberAssignment.model";
import { User } from "src/users/user.model";
import { UserService } from "src/users/user.service";
import { isNil } from "src/utils";

@Resolver(() => MemberAssignment)
export class MemberAssignmentResolver {
  constructor(private readonly _userService: UserService) {}

  @ResolveField("user", () => User)
  async getUser(@Parent() assignment: MemberAssignment): Promise<User> {
    const user = await this._userService.get(assignment.userId);
    if (isNil(user)) throw new Error("User not found");
    return user;
  }
}

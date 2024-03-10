import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { MemberAssignment } from "./memberAssignment.model";
import { User } from "src/users/user.model";
import { UserService } from "src/users/user.service";

@Resolver(() => MemberAssignment)
export class MemberAssignmentResolver {
  constructor(private readonly _userService: UserService) {}

  @ResolveField("user", () => User)
  async getUser(@Parent() assignment: MemberAssignment): Promise<User> {
    return this._userService.get(assignment.userId);
  }
}

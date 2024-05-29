import { Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { MemberAssignment } from "./memberAssignment.model";
import { User } from "src/users/user.model";
import { UserService } from "src/users/user.service";
import { isNil } from "src/utils";
import { CurrentMember, MemberContext } from "src/auth/currentUser.decorator";
import { AssignmentService } from "./assignment.service";
import { HouseService } from "src/houses/house.service";

@Resolver(() => MemberAssignment)
export class MemberAssignmentResolver {
  constructor(
    private readonly _userService: UserService,
    private readonly _assignmentService: AssignmentService,
    private readonly _houseService: HouseService,
  ) {}

  @ResolveField("user", () => User)
  async getUser(@Parent() assignment: MemberAssignment): Promise<User> {
    const user = await this._userService.get(assignment.userId);
    if (isNil(user)) throw new Error("User not found");
    return user;
  }

  @Query(() => [MemberAssignment], { name: "memberAssignments" })
  async getMemberAssignments(
    @CurrentMember() member: MemberContext,
  ): Promise<MemberAssignment[]> {
    const house = await this._houseService.getForUser(member.id);
    if (house == null) return [];

    const assignmentsPerMember =
      await this._assignmentService.getPerMember(house);

    return Object.entries(assignmentsPerMember).map(
      ([userId, assignments]) => ({ userId, assignments }),
    );
  }
}

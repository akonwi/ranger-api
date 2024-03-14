import { Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { House } from "./house.model";
import { UserService } from "src/users/user.service";
import { Maybe } from "src/utils";
import { HouseRepository } from "./house.repository";
import { User } from "src/users/user.model";
import { CurrentUser, UserContext } from "src/auth/currentUser.decorator";
import { Chore } from "src/chores/chore.model";
import { ChoreRepository } from "src/chores/chore.repository";
import { MemberAssignment } from "src/assignments/memberAssignment.model";
import { AssignmentService } from "src/assignments/assignment.service";

@Resolver(() => House)
export class HouseResolver {
  constructor(
    private readonly _houseRepository: HouseRepository,
    private readonly _userService: UserService,
    private readonly _choreRepository: ChoreRepository,
    private readonly _assignmentService: AssignmentService,
  ) {}

  @ResolveField("members", () => [User])
  async getMembers(@Parent() house: House): Promise<User[]> {
    return this._userService.findMany(house.memberIds);
  }

  @ResolveField("invites", () => [String])
  async getInvites(@Parent() house: House): Promise<string[]> {
    return this._houseRepository.getInvites(house.id);
  }

  @Query(() => House, { name: "myHouse", nullable: true })
  async getMyHouse(@CurrentUser() user: UserContext): Promise<Maybe<House>> {
    return this._houseRepository.getForUser(user.id);
  }

  @ResolveField("chores", () => [Chore])
  async getChores(@Parent() house: House): Promise<Chore[]> {
    return this._choreRepository.list({ houseId: house.id });
  }

  @ResolveField("memberAssignments", () => [MemberAssignment])
  async getMemberAssignments(
    @Parent() house: House,
  ): Promise<MemberAssignment[]> {
    const assignmentsPerMember =
      await this._assignmentService.getPerMember(house);

    return Object.entries(assignmentsPerMember).map(
      ([userId, assignments]) => ({ userId, assignments }),
    );
  }
}

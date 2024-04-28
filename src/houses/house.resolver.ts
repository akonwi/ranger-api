import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { House } from "./house.model";
import { UserService } from "src/users/user.service";
import { Maybe } from "src/utils";
import { HouseRepository } from "./house.repository";
import { User } from "src/users/user.model";
import {
  CurrentUser,
  CurrentMember,
  MemberContext,
  UserContext,
} from "src/auth/currentUser.decorator";
import { Chore } from "src/chores/chore.model";
import { ChoreRepository } from "src/chores/chore.repository";
import { MemberAssignment } from "src/assignments/memberAssignment.model";
import { AssignmentService } from "src/assignments/assignment.service";
import { ChoreService } from "src/chores/chore.service";

@Resolver(() => House)
export class HouseResolver {
  constructor(
    private readonly _houseRepository: HouseRepository,
    private readonly _userService: UserService,
    private readonly _choreRepository: ChoreRepository,
    private readonly _choreService: ChoreService,
    private readonly _assignmentService: AssignmentService,
  ) {}

  @Mutation(() => House)
  async createHouse(
    @CurrentUser() ctx: UserContext,
    @Args("name") name: string,
  ): Promise<House> {
    return this._houseRepository.create({
      name,
      creatorId: ctx.id,
    });
  }

  @ResolveField("members", () => [User])
  async getMembers(@Parent() house: House): Promise<User[]> {
    return this._userService.findMany(house.memberIds);
  }

  @ResolveField("invites", () => [String])
  async getInvites(@Parent() house: House): Promise<string[]> {
    return this._houseRepository.getInvites(house.id);
  }

  @Mutation(() => String)
  async createInvite(
    @CurrentMember() user: MemberContext,
    @Args({ name: "email", type: () => String }) email: string,
  ): Promise<string> {
    return this._houseRepository.createInvite(user.houseId, email);
  }

  @Query(() => House, { name: "myHouse", nullable: true })
  async getMyHouse(@CurrentUser() user: UserContext): Promise<Maybe<House>> {
    return this._houseRepository.getForUser(user.id);
  }

  @ResolveField("chores")
  async paused(@Parent() house: House): Promise<boolean> {
    return house.paused === true;
  }

  @ResolveField("chores", () => [Chore])
  async getChores(@Parent() house: House): Promise<Chore[]> {
    return this._choreService.getActive({ houseId: house.id });
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

  @Mutation(() => House)
  async pauseSchedule(@CurrentMember() user: MemberContext): Promise<House> {
    return this._houseRepository.update(user.houseId, { paused: true });
  }

  @Mutation(() => House)
  async resumeSchedule(@CurrentMember() user: MemberContext): Promise<House> {
    return this._houseRepository.update(user.houseId, { paused: false });
  }
}

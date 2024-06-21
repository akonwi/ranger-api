import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { House } from "./house.model";
import { UserService } from "../users/user.service";
import { Maybe } from "../utils";
import { HouseRepository } from "./house.repository";
import { User } from "../users/user.model";
import {
  CurrentUser,
  CurrentMember,
  MemberContext,
  UserContext,
} from "../auth/currentUser.decorator";
import { AssignmentService } from "../assignments/assignment.service";
import { HouseService } from "./house.service";

@Resolver(() => House)
export class HouseResolver {
  constructor(
    private readonly _houseRepository: HouseRepository,
    private readonly _houseService: HouseService,
    private readonly _userService: UserService,
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

  @ResolveField("paused")
  async paused(@Parent() house: House): Promise<boolean> {
    return house.paused === true;
  }

  @Mutation(() => House)
  async setHousePausedStatus(
    @CurrentMember() user: MemberContext,
    @Args({ name: "status", type: () => Boolean }) status: boolean,
  ): Promise<House> {
    return this._houseRepository.update(user.houseId, { paused: status });
  }

  @Mutation(() => House)
  async setManualPenaltiesEnabled(
    @CurrentMember() user: MemberContext,
    @Args({ name: "enabled", type: () => Boolean }) enabled: boolean,
  ): Promise<House> {
    return this._houseRepository.update(user.houseId, {
      manualPenaltiesEnabled: enabled,
    });
  }

  @Mutation(() => Boolean)
  async deleteHouse(@CurrentMember() user: MemberContext): Promise<boolean> {
    await this._houseService.destroy(user.houseId);
    return true;
  }
}

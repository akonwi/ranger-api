import {
  Args,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Frequency } from "@prisma/client";
import { Cadence, Chore, DayValue } from "./chore.model";
import { ChoreRepository } from "./chore.repository";
import { CurrentUser, UserContext } from "src/auth/currentUser.decorator";
import { inngest } from "src/inngest/inngest.provider";
import { Maybe, isNil, last } from "src/utils";
import { User } from "src/users/user.model";
import { UserService } from "src/users/user.service";
import { PaginatedAssignmentHistory } from "src/assignments/assignment.model";
import { AssignmentService } from "src/assignments/assignment.service";

@InputType()
export class CadenceInput {
  @Field(type => Frequency)
  frequency: Frequency;

  @Field(type => Int, { nullable: true })
  days?: number;
}

@InputType()
export class CreateChoreInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  designatedUserId?: string;

  @Field(() => CadenceInput, { nullable: true })
  cadence?: CadenceInput;

  @Field(() => Int, { nullable: true })
  dayOfWeek?: number;
}

@InputType()
export class EditChoreInput extends CreateChoreInput {}

@Resolver(() => Chore)
export class ChoreResolver {
  constructor(
    private readonly _choreRepository: ChoreRepository,
    private readonly _userService: UserService,
    private readonly _assignmentService: AssignmentService,
  ) {}

  @Query(() => [Chore])
  async chores(@CurrentUser() user: UserContext) {
    return this._choreRepository.list({ houseId: user.houseId });
  }

  @Query(() => Chore, { name: "chore", nullable: true })
  async getChore(
    @Args({ name: "id", type: () => ID }) id: string,
  ): Promise<Maybe<Chore>> {
    return this._choreRepository.get(id);
  }

  @ResolveField("designatedMember", () => User, { nullable: true })
  async getDesignatedUser(@Parent() chore: Chore): Promise<Maybe<User>> {
    if (isNil(chore.designatedUserId)) return null;

    return this._userService.get(chore.designatedUserId);
  }

  @ResolveField("day", () => DayValue, { nullable: true })
  day(@Parent() chore: Chore): Maybe<DayValue> {
    if (isNil(chore.day)) return null;

    switch (chore.day) {
      case 0:
        return { label: "Sunday", value: 0 };
      case 1:
        return { label: "Monday", value: 1 };
      case 2:
        return { label: "Tuesday", value: 2 };
      case 3:
        return { label: "Wednesday", value: 3 };
      case 4:
        return { label: "Thursday", value: 4 };
      case 5:
        return { label: "Friday", value: 5 };
      case 6:
        return { label: "Saturday", value: 6 };
      default:
        return null;
    }
  }

  @ResolveField("cadence", () => Cadence)
  async cadence(@Parent() chore: Chore) {
    return {
      frequency: chore.frequency,
      days: chore.customFrequency,
      label: this._getCadenceLabel(chore),
    };
  }

  private _getCadenceLabel(chore: Chore) {
    switch (chore.frequency) {
      case Frequency.WEEKLY:
        return "Weekly";
      case Frequency.MONTHLY:
        return "Monthly";
      case Frequency.ANNUALLY:
        return "Annually";
      case Frequency.CUSTOM:
        return `Every ${chore.customFrequency} days`;
      default:
        return "";
    }
  }

  @Mutation(() => Chore)
  async createChore(
    @CurrentUser() user: UserContext,
    @Args("input") input: CreateChoreInput,
  ): Promise<Chore> {
    if (input.cadence.frequency === Frequency.CUSTOM) {
      if (isNil(input.cadence.days)) {
        throw new Error("A custom frequency must have a 'days' value");
      }
    }

    const chore = await this._choreRepository.create({
      name: input.name,
      description: input.description,
      frequency: input.cadence?.frequency,
      customFrequency: input.cadence?.days,
      creatorId: user.id,
      house: {
        connect: {
          id: user.houseId,
        },
      },
    });

    await inngest.send({
      name: "chore.created",
      data: {
        houseId: user.houseId,
        id: chore.id,
      },
    });

    return chore;
  }

  @Mutation(() => Chore)
  async editChore(
    @Args({ name: "id", type: () => ID }) id: string,
    @Args("input") input: EditChoreInput,
  ): Promise<Chore> {
    if (input.cadence.frequency === Frequency.CUSTOM) {
      if (isNil(input.cadence.days)) {
        throw new Error("A custom frequency must have a 'days' value");
      }
    }

    return this._choreRepository.update({
      id: id,
      name: input.name,
      description: input.description,
      day: input.dayOfWeek,
      designatedUserId: input.designatedUserId,
      frequency: input.cadence?.frequency,
      customFrequency: input.cadence?.days,
    });
  }

  @ResolveField(() => PaginatedAssignmentHistory, { name: "history" })
  async getHistory(
    @Parent() chore: Chore,
    @Args({ name: "after", nullable: true }) after?: string,
  ): Promise<PaginatedAssignmentHistory> {
    const assignments = await this._assignmentService.getHistory({
      choreId: chore.id,
      houseId: chore.houseId,
      cursor: after,
    });

    const _last = last(assignments);
    const endCursor = _last?.id;
    const hasNextPage = isNil(_last) ? false : _last.week > 0;

    return {
      pageInfo: { hasNextPage, endCursor },
      edges: assignments,
    };
  }
}

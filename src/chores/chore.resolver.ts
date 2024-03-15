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
import { Maybe, isNil } from "src/utils";
import { User } from "src/users/user.model";
import { UserService } from "src/users/user.service";

@InputType()
export class CreateChoreInput {
  @Field()
  name: string;

  @Field(type => Frequency)
  frequency: Frequency;

  @Field(() => Int, { nullable: true })
  day?: number;

  @Field(() => Int, { nullable: true })
  customFrequency?: number;

  @Field()
  description: string;

  @Field({ nullable: true })
  designatedUserId?: string;
}

@InputType()
export class CadenceInput {
  @Field(type => Frequency)
  frequency: Frequency;

  @Field(type => Int, { nullable: true })
  days?: number;
}

@InputType()
export class EditChoreInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  designatedUserId?: string;

  @Field(() => CadenceInput, { nullable: true })
  cadence?: CadenceInput;
}

@Resolver(() => Chore)
export class ChoreResolver {
  constructor(
    private readonly _choreRepository: ChoreRepository,
    private readonly _userService: UserService,
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
    const chore = await this._choreRepository.create({
      name: input.name,
      description: input.description,
      frequency: input.frequency,
      customFrequency: input.customFrequency,
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
  async editChore(@Args("input") input: EditChoreInput): Promise<Chore> {
    return this._choreRepository.update({
      id: input.id,
      name: input.name,
      description: input.description,
      designatedUserId: input.designatedUserId,
      frequency: input.cadence?.frequency,
      customFrequency: input.cadence?.days,
    });
  }
}

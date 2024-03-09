import {
  Args,
  Field,
  InputType,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Frequency } from "@prisma/client";
import { Cadence, Chore } from "./chore.model";
import { ChoreRepository } from "./chore.repository";
import { CurrentUser, UserContext } from "src/auth/currentUser.decorator";
import { inngest } from "src/inngest/inngest.provider";

@InputType()
export class CreateChoreInput {
  @Field()
  id: string;

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
  constructor(private readonly _choreRepository: ChoreRepository) {}

  @Query(() => [Chore])
  async chores(@CurrentUser() user: UserContext) {
    return this._choreRepository.list({ houseId: user.houseId });
  }

  @ResolveField('cadence', () => Cadence)
  async cadence(@Parent() chore: Chore) {
    return {
      frequency: chore.frequency,
      days: chore.customFrequency
    }
  }

  @Mutation(() => Chore)
  async createChore(
    @CurrentUser() user: UserContext,
    @Args('input') input: CreateChoreInput,
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
  async editChore(
    @Args('input') input: EditChoreInput,
  ): Promise<Chore> {
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

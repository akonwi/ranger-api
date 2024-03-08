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
import { CurrentUser, User } from "src/auth/user.decorator";

@InputType()
export class CreateChoreInput {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field((type) => Frequency)
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
  @Field((type) => Frequency)
  frequency: Frequency;

  @Field((type) => Int, { nullable: true })
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

  @Field({nullable: true})
  designatedUserId?: string;

  @Field(type => CadenceInput, { nullable: true })
  cadence?: CadenceInput;
}

@Resolver((of) => Chore)
export class ChoreResolver {
  constructor(private readonly _choreRepository: ChoreRepository) { }

  @Query((returns) => [Chore])
  async chores(@User() user: CurrentUser) {
    return this._choreRepository.list({ houseId: user.houseId });
  }

  @ResolveField('cadence', returns => Cadence)
  async cadence(@Parent() chore: Chore) {
    return {
      frequency: chore.frequency,
      days: chore.customFrequency
    }
  }

  @Mutation((returns) => Chore)
  async createChore(@User() user: CurrentUser,@Args('input') input: CreateChoreInput): Promise<Chore> {
    return this._choreRepository.create({
      name: input.name,
      description: input.description,
      frequency: input.frequency,
      customFrequency: input.customFrequency,
      creatorId: user.id,
      house: {
        connect: {
          id: user.houseId
        }
      }
    });
  }

  @Mutation((returns) => Chore)
  async editChore(@User() user: CurrentUser, @Args('input') input: EditChoreInput): Promise<Chore> {
    return this._choreRepository.update({
      id: input.id,
      name: input.name,
      description: input.description,
      designatedUserId: input.designatedUserId,
      frequency: input.cadence?.frequency,
      customFrequency: input.cadence?.days
    });
  }
}

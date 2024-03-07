import {
  Args,
  Field,
  InputType,
  Int,
  Mutation,
  Query,
  Resolver,
  registerEnumType,
} from "@nestjs/graphql";
import { Frequency } from "@prisma/client";
import { Chore } from "./chore.model";
import { ChoreRepository } from "./chore.repository";
import { CurrentUser, User } from "src/auth/user.decorator";

registerEnumType(Frequency, { name: "Frequency" });

@InputType()
export class CreateChoreInput {
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

@Resolver((of) => Chore)
export class ChoreResolver {
  constructor(private readonly _choreRepository: ChoreRepository) { }

  @Query((returns) => [Chore])
  async chores(@User() user: CurrentUser) {
    return [];
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
}

import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class House {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  memberIds: string[];

  @Field(() => Int)
  week: number;
}

import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class Assignment {
  @Field(() => ID)
  id: string;

  houseId: string;

  choreId: string;

  userId: string;

  @Field(() => Int)
  week: number;
}

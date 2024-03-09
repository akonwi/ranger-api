import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class House {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  memberIds: string[];
}

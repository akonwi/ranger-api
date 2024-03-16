import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  nickname: string;

  @Field()
  email: string;

  appMetadata: Record<string, any>;
}

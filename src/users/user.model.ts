import { Field, ID, ObjectType } from "@nestjs/graphql";
import { GetUsers200ResponseOneOfInnerAppMetadata } from "auth0";

export type AppMetadata = GetUsers200ResponseOneOfInnerAppMetadata & {
  deviceTokens: string[];
};

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

  appMetadata: AppMetadata;
}

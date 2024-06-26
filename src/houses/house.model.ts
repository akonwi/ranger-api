import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { Maybe } from "../utils";

@ObjectType()
export class House {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  memberIds: string[];

  @Field(() => Int)
  week: number;

  @Field(() => Boolean, { nullable: false })
  paused: Maybe<boolean>;

  @Field(() => Boolean, { nullable: false })
  manualPenaltiesEnabled: Maybe<boolean>;
}

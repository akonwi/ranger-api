import { Field, ID, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { Frequency } from "@prisma/client";
import { Maybe } from "../utils";

registerEnumType(Frequency, { name: "Frequency" });

@ObjectType()
export class Cadence {
  @Field(type => Frequency)
  frequency: Frequency;

  @Field(type => Int, { nullable: true })
  days?: number;

  @Field()
  label: string;
}

@ObjectType("Day")
export class DayValue {
  @Field(type => Int)
  value: number;

  @Field()
  label: string;
}

@ObjectType()
export class Chore {
  @Field(type => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: false })
  description: Maybe<string>;

  @Field()
  houseId: string;

  frequency: Frequency;

  customFrequency: number | null;

  day: number | null;

  designatedUserId: string | null;

  @Field(() => Date, { nullable: true })
  deletedAt: Maybe<Date>;
}

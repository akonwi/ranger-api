import { Field, ObjectType } from "@nestjs/graphql";
import { Assignment } from "./assignment.model";

@ObjectType()
export class MemberAssignment {
  @Field()
  userId: string;

  @Field(() => [Assignment])
  assignments: Assignment[];
}

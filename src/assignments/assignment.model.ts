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

  @Field()
  completed: boolean;

  @Field()
  isPenalty: boolean;
}

@ObjectType()
export class PageInfo {
  @Field()
  hasNextPage: boolean;

  @Field({ nullable: true })
  endCursor?: string;
}

@ObjectType()
export class PaginatedAssignmentHistory {
  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => [Assignment])
  edges: Assignment[];
}

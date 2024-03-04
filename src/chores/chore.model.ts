import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class Chore {
	@Field((type) => ID)
	id: string;

	@Field()
	name: string;
}

import { Query, Resolver } from "@nestjs/graphql";
import { Chore } from "./chore.model";

@Resolver((of) => Chore)
export class ChoreResolver {
	@Query((returns) => [Chore])
	async chores() {
		return [];
	}
}

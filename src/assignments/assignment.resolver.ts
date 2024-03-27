import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Assignment, PaginatedAssignmentHistory } from "./assignment.model";
import { Chore } from "src/chores/chore.model";
import { ChoreRepository } from "src/chores/chore.repository";
import { UserService } from "src/users/user.service";
import { User } from "src/users/user.model";
import { AssignmentService } from "./assignment.service";
import { CurrentUser, UserContext } from "src/auth/currentUser.decorator";
import { isNil, last } from "src/utils";

@Resolver(() => Assignment)
export class AssignmentResolver {
  constructor(
    private readonly _assignmentService: AssignmentService,
    private readonly _choreRepository: ChoreRepository,
    private readonly _userService: UserService,
  ) {}

  @ResolveField("chore", () => Chore)
  async getChore(@Parent() assignment: Assignment): Promise<Chore> {
    return this._choreRepository.get(assignment.choreId);
  }

  @ResolveField("user", () => User)
  async getUser(@Parent() assignment: Assignment): Promise<User> {
    return this._userService.get(assignment.userId);
  }

  @Mutation(() => Assignment)
  async setAssignmentStatus(
    @Args({ name: "id", type: () => ID }) id: string,
    @Args("completed") completed: boolean,
  ): Promise<Assignment> {
    return this._assignmentService.setStatus(id, completed);
  }

  @Mutation(() => [Assignment])
  async reassignAssignment(
    @Args({ name: "id", type: () => ID }) id: string,
    @Args({ name: "userId", type: () => ID }) userId: string,
    @CurrentUser() currentUser: UserContext,
  ): Promise<Assignment[]> {
    return this._assignmentService.reassign({
      fromUserId: currentUser.id,
      toUserId: userId,
      ids: [id],
    });
  }

  @Query(() => PaginatedAssignmentHistory, { name: "history" })
  async getHistory(
    @CurrentUser() ctx: UserContext,
    @Args({ name: "id", type: () => ID }) choreId: string,
    @Args({ name: "after", nullable: true }) after?: string,
  ): Promise<PaginatedAssignmentHistory> {
    const assignments = await this._assignmentService.getHistory({
      choreId,
      houseId: ctx.houseId,
      cursor: after,
    });

    const _last = last(assignments);
    const endCursor = _last?.id;
    const hasNextPage = isNil(_last) ? false : _last.week > 0;

    return {
      pageInfo: { hasNextPage, endCursor },
      edges: assignments,
    };
  }
}

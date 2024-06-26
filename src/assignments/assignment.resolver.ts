import {
  Args,
  ID,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Assignment } from "./assignment.model";
import { Chore } from "../chores/chore.model";
import { ChoreRepository } from "../chores/chore.repository";
import { UserService } from "../users/user.service";
import { User } from "../users/user.model";
import { AssignmentService } from "./assignment.service";
import { CurrentUser, UserContext } from "../auth/currentUser.decorator";
import { isNil } from "../utils";

@Resolver(() => Assignment)
export class AssignmentResolver {
  constructor(
    private readonly _assignmentService: AssignmentService,
    private readonly _choreRepository: ChoreRepository,
    private readonly _userService: UserService,
  ) {}

  @ResolveField("chore", () => Chore)
  async getChore(@Parent() assignment: Assignment): Promise<Chore> {
    const chore = await this._choreRepository.get(assignment.choreId);
    if (isNil(chore)) throw new Error("Chore not found");
    return chore;
  }

  @ResolveField("user", () => User)
  async getUser(@Parent() assignment: Assignment): Promise<User> {
    const user = await this._userService.get(assignment.userId);
    if (isNil(user)) throw new Error("User not found");
    return user;
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
    @CurrentUser() currentUser: UserContext,
    @Args({ name: "id", type: () => ID }) id: string,
    @Args({ name: "userId", type: () => ID }) userId: string,
    @Args({ name: "asPenalty", type: () => Boolean, nullable: true })
    asPenalty = false,
  ): Promise<Assignment[]> {
    return this._assignmentService.reassign({
      fromUserId: currentUser.id,
      toUserId: userId,
      ids: [id],
      asPenalty,
    });
  }
}

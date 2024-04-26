import {
  Args,
  ID,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Assignment } from "./assignment.model";
import { Chore } from "src/chores/chore.model";
import { ChoreRepository } from "src/chores/chore.repository";
import { UserService } from "src/users/user.service";
import { User } from "src/users/user.model";
import { AssignmentService } from "./assignment.service";
import { CurrentUser, UserContext } from "src/auth/currentUser.decorator";
import { isNil } from "src/utils";

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
}

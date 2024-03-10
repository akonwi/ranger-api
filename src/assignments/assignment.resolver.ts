import {
  Field,
  ObjectType,
  Parent,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Assignment } from "./assignment.model";
import { Chore } from "src/chores/chore.model";
import { ChoreRepository } from "src/chores/chore.repository";
import { UserService } from "src/users/user.service";
import { User } from "src/users/user.model";

@Resolver(() => Assignment)
export class AssignmentResolver {
  constructor(
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
}

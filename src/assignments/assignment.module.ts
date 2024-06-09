import { Module } from "@nestjs/common";
import { CommonModule } from "src/common.module";
import { AssignmentService } from "./assignment.service";
import { AssignmentResolver } from "./assignment.resolver";
import { HouseModule } from "src/houses/house.module";
import { ChoreRepository } from "src/chores/chore.repository";
import { AssignmentRepository } from "./assignment.repository";
import { UserService } from "src/users/user.service";
import { MemberAssignmentResolver } from "./memberAssignment.resolver";

@Module({
  imports: [CommonModule, HouseModule],
  providers: [
    ChoreRepository,
    AssignmentRepository,
    AssignmentService,
    AssignmentResolver,
    MemberAssignmentResolver,
    UserService,
  ],
  exports: [
    AssignmentService,
    AssignmentRepository,
    AssignmentResolver,
    MemberAssignmentResolver,
  ],
})
export class AssignmentModule {}

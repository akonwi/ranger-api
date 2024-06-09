import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { AuthGuard } from "./auth/auth.guard";
import { ChoreRepository } from "./chores/chore.repository";
import { ChoreResolver } from "./chores/chore.resolver";
import { FunctionService } from "./inngest/function.service";
import { UserService } from "./users/user.service";
import { AssignmentService } from "./assignments/assignment.service";
import { AssignmentRepository } from "./assignments/assignment.repository";
import { AssignmentResolver } from "./assignments/assignment.resolver";
import { MemberAssignmentResolver } from "./assignments/memberAssignment.resolver";
import { UserResolver } from "./users/user.resolver";
import { ViewerResolver } from "./viewer/viewer.resolver";
import { FirebaseService } from "./firebase.service";
import { ChoreService } from "./chores/chore.service";
import { HouseModule } from "./houses/house.module";
import { CommonModule } from "./common.module";
import { HouseResolver } from "./houses/house.resolver";
import { AssignmentModule } from "./assignments/assignment.module";

@Module({
  imports: [
    CommonModule,
    HouseModule,
    AssignmentModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: process.env.NODE_ENV !== "production",
    }),
  ],
  controllers: [],
  providers: [
    ViewerResolver,
    HouseResolver,
    ChoreResolver,
    ChoreService,
    ChoreRepository,
    FunctionService,
    UserService,
    UserResolver,
    FirebaseService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}

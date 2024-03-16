import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { AuthGuard } from "./auth/auth.guard";
import { ChoreRepository } from "./chores/chore.repository";
import { ChoreResolver } from "./chores/chore.resolver";
import { HouseRepository } from "./houses/house.repository";
import { FunctionService } from "./inngest/function.service";
import { PrismaService } from "./prisma.service";
import { HouseResolver } from "./houses/house.resolver";
import { UserService } from "./users/user.service";
import { AssignmentService } from "./assignments/assignment.service";
import { AssignmentRepository } from "./assignments/assignment.repository";
import { AssignmentResolver } from "./assignments/assignment.resolver";
import { MemberAssignmentResolver } from "./assignments/memberAssignment.resolver";
import { UserResolver } from "./users/user.resolver";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env"] }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: process.env.NODE_ENV !== "production",
    }),
  ],
  controllers: [],
  providers: [
    PrismaService,
    AppService,
    HouseResolver,
    HouseRepository,
    ChoreResolver,
    ChoreRepository,
    FunctionService,
    UserService,
    UserResolver,
    AssignmentRepository,
    AssignmentService,
    AssignmentResolver,
    MemberAssignmentResolver,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}

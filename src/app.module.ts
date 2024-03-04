import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ChoreResolver } from "./chores/chore.resolver";

@Module({
	imports: [
		GraphQLModule.forRoot<ApolloDriverConfig>({
			driver: ApolloDriver,
			autoSchemaFile: true,
			sortSchema: true,
			playground: process.env.NODE_ENV !== "production",
		}),
	],
	controllers: [AppController],
	providers: [AppService, ChoreResolver],
})
export class AppModule {}

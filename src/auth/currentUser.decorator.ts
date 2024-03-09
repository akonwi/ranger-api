import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Maybe } from "src/utils";

export type UserContext = {
  id: string;
  houseId: Maybe<string>;
};

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContext => {
    const context = GqlExecutionContext.create(ctx).getContext();
    return context.req.user;
  },
);

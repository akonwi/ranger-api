import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Maybe } from "src/utils";

export type CurrentUser = {
  id: string;
  houseId: Maybe<string>;
};

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser => {
    const context = GqlExecutionContext.create(ctx).getContext();
    return context.req.user;
  },
);

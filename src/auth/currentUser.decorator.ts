import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Maybe, NoNil } from "src/utils";

export type UserContext = {
  id: string;
  houseId: Maybe<string>;
};

export type MemberContext = NoNil<UserContext>;

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContext => {
    const context = GqlExecutionContext.create(ctx).getContext();
    return context.req.user;
  },
);

export const CurrentMember = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): MemberContext => {
    const context = GqlExecutionContext.create(ctx).getContext();
    return context.req.user;
  },
);

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Request } from "express";
import * as jose from "jose";
import { HouseRepository } from "../houses/house.repository";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { UserContext } from "./currentUser.decorator";
import { Maybe, isNil } from "../utils";

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly _logger = new Logger(AuthGuard.name);

  constructor(
    private _configService: ConfigService,
    private _reflector: Reflector,
    private _houseRepository: HouseRepository,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this._reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);

    const gqlContext = ctx.getContext();
    const request = gqlContext.req;
    const token = await this._getTokenFromHeader(request);

    if (!token) throw new UnauthorizedException();

    const userId = await this._validateToken(token);
    const house = await this._houseRepository.getForUser(userId);

    request.user = {
      id: userId,
      houseId: house?.id ?? null,
    } satisfies UserContext;
    return true;
  }

  private _getTokenFromHeader(request: Request): Maybe<string> {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : null;
  }

  // returns the user id
  private async _validateToken(token: string): Promise<string> {
    const jwks = this._configService.getOrThrow("JWKS");

    try {
      const result = await jose.jwtVerify(
        token,
        jose.createLocalJWKSet(JSON.parse(jwks)),
        {
          audience: this._configService.getOrThrow("AUTH0_AUDIENCE"),
          issuer: this._configService.getOrThrow("AUTH0_ISSUER_BASE_URL"),
        },
      );

      const sub = result.payload.sub;
      if (isNil(sub)) {
        throw new Error("Invalid token");
      }

      return sub;
    } catch (e) {
      this._logger.error(e);
      throw new UnauthorizedException(e);
    }
  }
}

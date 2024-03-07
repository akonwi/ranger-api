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
import { HouseRepository } from "src/houses/house.repository";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { CurrentUser } from "./user.decorator";

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
      houseId: house?.id,
    } satisfies CurrentUser;
    return true;
  }

  private async _getTokenFromHeader(request: Request): Promise<string> {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }

  // returns the user id
  private async _validateToken(token: string): Promise<string> {
    const jwks = this._configService.getOrThrow("JWKS");

    const result = await jose.jwtVerify(
      token,
      jose.createLocalJWKSet(JSON.parse(jwks)),
      {
        audience: this._configService.getOrThrow("AUTH0_AUDIENCE"),
        issuer: this._configService.getOrThrow("AUTH0_ISSUER_BASE_URL"),
      },
    );
    if (!result.payload.sub) {
      this._logger.error("Invalid token");
      throw new UnauthorizedException();
    }

    return result.payload.sub;
  }
}

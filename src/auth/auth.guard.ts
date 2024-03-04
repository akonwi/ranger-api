import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import * as jose from "jose";

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly _logger = new Logger(AuthGuard.name);

  constructor(private readonly _configService: ConfigService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = await this._getTokenFromHeader(request);

    if (!token) throw new UnauthorizedException();

    return true;
  }

  private async _getTokenFromHeader(request: Request): Promise<string> {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }

  private async validateToken(token: string): Promise<string> {
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

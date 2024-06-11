import { Inject, Injectable, Logger } from "@nestjs/common";
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { AppMetadata, User } from "./user.model";
import {
  GetUsers200ResponseOneOfInner,
  GetUsers200ResponseOneOfInnerAppMetadata,
  ManagementClient,
} from "auth0";
import { ConfigService } from "@nestjs/config";
import { Maybe, isNil } from "../utils";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly _auth0: ManagementClient;

  constructor(
    configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly _cacheManager: Cache,
  ) {
    this._auth0 = new ManagementClient({
      domain: configService.getOrThrow("AUTH0_DOMAIN"),
      clientId: configService.getOrThrow("AUTH0_CLIENT_ID"),
      clientSecret: configService.getOrThrow("AUTH0_CLIENT_SECRET"),
    });
  }

  async get(id: string): Promise<Maybe<User>> {
    const cached = await this._cacheManager.get<User>(id);
    if (cached) return cached;

    const response = await this._auth0.users.get({ id });

    if (response.status === 200) {
      const user = this._mapUser(response.data);
      this._cacheManager.set(id, user, 1000 * 60);
      return user;
    }

    return null;
  }

  async findMany(ids: string[]): Promise<User[]> {
    const response = await this._auth0.users.getAll({
      q: `user_id:(${ids.map(id => `"${id}"`).join(" OR ")})`,
      search_engine: "v3",
    });

    if (response.status === 200) {
      return response.data.map(u => this._mapUser(u));
    }

    return [];
  }

  async delete(id: string): Promise<void> {
    await this._auth0.users.delete({ id });
  }

  async updateAppMetadata(
    id: string,
    input: Partial<Pick<AppMetadata, "deviceTokens">>,
  ) {
    await this._auth0.users.update(
      { id },
      {
        app_metadata: input,
      },
    );
  }

  async saveDeviceToken(id: string, token: string) {
    const user = await this.get(id);

    if (isNil(user)) {
      this.logger.warn(`Cannot update deviceToken. User ${id} not found`);
      return;
    }

    const deviceTokens = new Set(user.appMetadata.deviceTokens);
    deviceTokens.add(token);

    await this.updateAppMetadata(id, {
      deviceTokens: Array.from(deviceTokens),
    });
  }

  private _mapUser(u: GetUsers200ResponseOneOfInner): User {
    return {
      id: u.user_id,
      name: u.name,
      email: u.email,
      nickname: u.nickname,
      appMetadata: this._mapAppMetadata(u.app_metadata ?? {}),
    };
  }

  private _mapAppMetadata(
    metadata: GetUsers200ResponseOneOfInnerAppMetadata,
  ): AppMetadata {
    return {
      ...metadata,
      deviceTokens: metadata.deviceTokens ?? [],
    };
  }
}

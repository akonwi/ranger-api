import { ConfigService } from "@nestjs/config";
import * as firebase from "firebase-admin";
import { UserService } from "./users/user.service";
import { isNil } from "./utils";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class FirebaseService {
  private readonly _logger = new Logger(FirebaseService.name);

  constructor(
    configService: ConfigService,
    private readonly _userService: UserService,
  ) {
    if (firebase.apps.length === 0) {
      firebase.initializeApp({
        credential: firebase.credential.cert(
          JSON.parse(configService.getOrThrow("GOOGLE_SERVICE_ACCOUNT_KEY")),
        ),
      });
    }
  }

  async saveDeviceToken(input: {
    token: string;
    userId: string;
  }): Promise<void> {
    const user = await this._userService.get(input.userId);

    if (isNil(user)) {
      this._logger.log("Cannot save deviceToken.", { userId: input.userId });
      return;
    }
    const deviceTokens = new Set<string>(user.appMetadata.deviceTokens);
    deviceTokens.add(input.token);

    await this._userService.updateAppMetadata(input.userId, {
      deviceTokens: Array.from(deviceTokens),
    });
  }
}

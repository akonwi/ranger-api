import * as firebase from "firebase-admin";
import { UserService } from "./users/user.service";
import { isNil } from "./utils";
import { Injectable, Logger } from "@nestjs/common";
import { Notification } from "firebase-admin/lib/messaging/messaging-api";

@Injectable()
export class FirebaseService {
  private readonly _logger = new Logger(FirebaseService.name);

  constructor(private readonly _userService: UserService) {
    if (firebase.apps.length === 0) {
      firebase.initializeApp({
        credential: firebase.credential.cert(
          require("../firebase-account-key.json"),
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

  async sendNotification(input: {
    deviceTokens: string[];
    notification: Notification;
  }) {
    const result = await firebase.messaging().sendEachForMulticast({
      tokens: input.deviceTokens,
      notification: input.notification,
    });
    // TODO: delete bad tokens based on result.failureCount
    // result.responses.forEach((response, index) => {
    //   response.error;
    // });
  }
}

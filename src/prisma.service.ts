import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(_configService: ConfigService) {
    const isDev = _configService.get("NODE_ENV") === "development";
    super({
      log: isDev ? ["error", "warn", "query"] : ["error"],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}

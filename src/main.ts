import { NestFactory } from "@nestjs/core";
import { serve } from "inngest/express";
import { AppModule } from "./app.module";
import { inngest } from "./inngest/inngest.provider";
import { FunctionService } from "./inngest/function.service";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  app.useBodyParser("json", { limit: "10mb" });

  const functionService = app.get(FunctionService);
  app.use(
    "/api/inngest",
    serve({ client: inngest, functions: functionService.getFunctions() }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get("PORT", 3000);
  await app.listen(port).then(() => {
    new Logger("main").log(`Listening on port ${port}`);
  });
}
bootstrap();

import { NestFactory } from "@nestjs/core";
import { serve } from "inngest/express";
import { AppModule } from "./app.module";
import { inngest } from "./inngest/inngest.provider";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use("/api/inngest", serve({ client: inngest, functions: [] }));

  await app.listen(3000);
}
bootstrap();

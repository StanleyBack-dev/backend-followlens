import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./bootstrap/configure-app";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);

  const port = app.get(ConfigService).get<number>("PORT") || 4000;
  await app.listen(port);
  console.log(`\n🚀 FollowLens API rodando em http://localhost:${port}`);
}

void bootstrap();

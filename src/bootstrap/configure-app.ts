import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import express from "express";
import helmet from "helmet";

// Shared by the local server (main.ts) and the Vercel handler (serverless.ts).
// Body parsing is set up here (the app is created with bodyParser:false) so the
// upload route can receive raw bytes while the rest stays JSON.
export function configureApp(app: INestApplication): void {
  app.use(helmet());

  const config = app.get(ConfigService);
  const maxMb = config.get<number>("IMPORT_MAX_FILE_MB") ?? 4;
  // A little headroom above the business limit (enforced again in the use case).
  const rawLimit = `${maxMb + 1}mb`;

  app.use(
    "/imports/upload",
    express.raw({ type: () => true, limit: rawLimit }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  app.enableCors(config.get("cors"));
  app.enableShutdownHooks();
}

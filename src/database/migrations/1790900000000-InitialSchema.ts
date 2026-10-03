import type { MigrationInterface, QueryRunner } from "typeorm";

// Multi-user schema: one account per Google sign-in, all follower data scoped
// by user id. Session-based sync is owner-only and writes to the owner's list.
export class InitialSchema1790900000000 implements MigrationInterface {
  name = "InitialSchema1790900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // === users ===
    await queryRunner.query(`
      CREATE TABLE "tb_users" (
        "idtb_users" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "google_id" varchar(40) NOT NULL,
        "email" varchar(160) NOT NULL,
        "name" varchar(160) NOT NULL,
        "picture_url" text NULL,
        "plan" varchar(8) NOT NULL DEFAULT 'free' CHECK ("plan" IN ('free', 'pro')),
        "role" varchar(8) NOT NULL DEFAULT 'user' CHECK ("role" IN ('user', 'admin')),
        "terms_version" varchar(16) NULL,
        "terms_accepted_at" timestamptz NULL,
        "last_login_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_google_id" ON "tb_users" ("google_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email" ON "tb_users" ("email")`,
    );

    // === followers ===
    await queryRunner.query(`
      CREATE TABLE "tb_followers" (
        "idtb_users" uuid NOT NULL REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "username" varchar(64) NOT NULL,
        "status" varchar(16) NOT NULL CHECK ("status" IN ('active', 'lost')),
        "followed_at" timestamptz NULL,
        "first_seen_at" timestamptz NOT NULL,
        "last_seen_at" timestamptz NOT NULL,
        "lost_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("idtb_users", "username")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_followers_user_status" ON "tb_followers" ("idtb_users", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "tb_follower_events" (
        "idtb_follower_events" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "username" varchar(64) NOT NULL,
        "type" varchar(16) NOT NULL CHECK ("type" IN ('lost', 'gained', 'returned')),
        "idtb_imports" uuid NOT NULL,
        "occurred_at" timestamptz NOT NULL,
        "notified_at" timestamptz NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_follower_events_user_type_occurred" ON "tb_follower_events" ("idtb_users", "type", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follower_events_user_username" ON "tb_follower_events" ("idtb_users", "username")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follower_events_pending" ON "tb_follower_events" ("idtb_users", "type") WHERE "notified_at" IS NULL`,
    );

    // === imports ===
    await queryRunner.query(`
      CREATE TABLE "tb_imports" (
        "idtb_imports" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "status" varchar(16) NOT NULL CHECK ("status" IN ('completed', 'failed')),
        "filename" varchar(160) NULL,
        "followers_count" int NULL,
        "baseline" boolean NOT NULL DEFAULT false,
        "lost_count" int NULL,
        "gained_count" int NULL,
        "error_code" varchar(48) NULL,
        "error_message" varchar(500) NULL,
        "local_date" date NOT NULL,
        "created_at" timestamptz NOT NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_imports_user_local_date" ON "tb_imports" ("idtb_users", "local_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_imports_user_created" ON "tb_imports" ("idtb_users", "created_at")`,
    );

    // === shared lease lock ===
    await queryRunner.query(`
      CREATE TABLE "tb_locks" (
        "name" varchar(64) PRIMARY KEY,
        "holder" varchar(64) NOT NULL,
        "lease_until" timestamptz NOT NULL
      )
    `);

    // === sync (owner-only session mode) ===
    await queryRunner.query(`
      CREATE TABLE "tb_sync_runs" (
        "idtb_sync_runs" uuid PRIMARY KEY,
        "trigger" varchar(16) NOT NULL CHECK ("trigger" IN ('manual', 'cron')),
        "status" varchar(16) NOT NULL CHECK ("status" IN ('running', 'paused', 'completed', 'failed')),
        "local_date" date NOT NULL,
        "ig_user_id" varchar(32) NULL,
        "cursor" text NULL,
        "pages_fetched" int NOT NULL DEFAULT 0,
        "followers_collected" int NOT NULL DEFAULT 0,
        "invocations" int NOT NULL DEFAULT 1,
        "lost_count" int NULL,
        "gained_count" int NULL,
        "error_code" varchar(32) NULL,
        "error_message" varchar(500) NULL,
        "started_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "finished_at" timestamptz NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_sync_runs_local_date" ON "tb_sync_runs" ("local_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sync_runs_status_started" ON "tb_sync_runs" ("status", "started_at")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sync_runs_single_unfinished" ON "tb_sync_runs" ((true)) WHERE "status" IN ('running', 'paused')`,
    );

    await queryRunner.query(`
      CREATE TABLE "tb_sync_run_items" (
        "idtb_sync_runs" uuid NOT NULL REFERENCES "tb_sync_runs" ("idtb_sync_runs") ON DELETE CASCADE,
        "username" varchar(64) NOT NULL,
        PRIMARY KEY ("idtb_sync_runs", "username")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tb_integration_state" (
        "id" varchar(32) PRIMARY KEY,
        "blocked" boolean NOT NULL DEFAULT false,
        "reason" varchar(255) NULL,
        "blocked_at" timestamptz NULL,
        "session_fingerprint" varchar(64) NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_integration_state"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_sync_run_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_sync_runs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_locks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_imports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_follower_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_followers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_users"`);
  }
}

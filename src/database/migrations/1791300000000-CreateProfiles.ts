import type { MigrationInterface, QueryRunner } from "typeorm";

// One user can track several Instagram profiles. Follower data moves from
// being keyed by the user to being keyed by a profile; every existing user
// gets a default profile that inherits the data they already have.
export class CreateProfiles1791300000000 implements MigrationInterface {
  name = "CreateProfiles1791300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tb_profiles" (
        "idtb_profiles" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "name" varchar(40) NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_profiles_user_created" ON "tb_profiles" ("idtb_users", "created_at")`,
    );
    // At most one default per user; also what makes its lazy creation safe.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_profiles_user_default" ON "tb_profiles" ("idtb_users") WHERE "is_default"`,
    );
    await queryRunner.query(`
      INSERT INTO "tb_profiles" ("idtb_users", "name", "is_default")
      SELECT "idtb_users", 'Perfil principal', true FROM "tb_users"
    `);

    for (const table of ["tb_followers", "tb_follower_events", "tb_imports"]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "idtb_profiles" uuid NULL`,
      );
      await queryRunner.query(`
        UPDATE "${table}" t SET "idtb_profiles" = p."idtb_profiles"
        FROM "tb_profiles" p
        WHERE p."idtb_users" = t."idtb_users" AND p."is_default"
      `);
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ALTER COLUMN "idtb_profiles" SET NOT NULL,
          ADD CONSTRAINT "FK_${table}_profile" FOREIGN KEY ("idtb_profiles")
            REFERENCES "tb_profiles" ("idtb_profiles") ON DELETE CASCADE
      `);
    }

    // Dropping the user column also drops the key and the indexes built on it.
    await queryRunner.query(
      `ALTER TABLE "tb_followers" DROP CONSTRAINT IF EXISTS "tb_followers_pkey"`,
    );
    for (const table of ["tb_followers", "tb_follower_events", "tb_imports"]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "idtb_users"`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "tb_followers" ADD PRIMARY KEY ("idtb_profiles", "username")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_followers_profile_status" ON "tb_followers" ("idtb_profiles", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follower_events_profile_type_occurred" ON "tb_follower_events" ("idtb_profiles", "type", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follower_events_profile_username" ON "tb_follower_events" ("idtb_profiles", "username")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follower_events_profile_pending" ON "tb_follower_events" ("idtb_profiles", "type") WHERE "notified_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_imports_profile_local_date" ON "tb_imports" ("idtb_profiles", "local_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_imports_profile_created" ON "tb_imports" ("idtb_profiles", "created_at")`,
    );
  }

  // Lossy by nature: a user's profiles are merged back into one list. When
  // two profiles of the same user track the same @username, one row is kept.
  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ["tb_followers", "tb_follower_events", "tb_imports"]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "idtb_users" uuid NULL`,
      );
      await queryRunner.query(`
        UPDATE "${table}" t SET "idtb_users" = p."idtb_users"
        FROM "tb_profiles" p WHERE p."idtb_profiles" = t."idtb_profiles"
      `);
    }
    await queryRunner.query(`
      DELETE FROM "tb_followers" a USING "tb_followers" b
      WHERE a."idtb_users" = b."idtb_users" AND a."username" = b."username"
        AND a."idtb_profiles" > b."idtb_profiles"
    `);
    await queryRunner.query(
      `ALTER TABLE "tb_followers" DROP CONSTRAINT IF EXISTS "tb_followers_pkey"`,
    );
    for (const table of ["tb_followers", "tb_follower_events", "tb_imports"]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "idtb_profiles"`,
      );
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ALTER COLUMN "idtb_users" SET NOT NULL,
          ADD CONSTRAINT "FK_${table}_user" FOREIGN KEY ("idtb_users")
            REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE
      `);
    }
    await queryRunner.query(
      `ALTER TABLE "tb_followers" ADD PRIMARY KEY ("idtb_users", "username")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_followers_user_status" ON "tb_followers" ("idtb_users", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follower_events_user_type_occurred" ON "tb_follower_events" ("idtb_users", "type", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follower_events_user_username" ON "tb_follower_events" ("idtb_users", "username")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follower_events_pending" ON "tb_follower_events" ("idtb_users", "type") WHERE "notified_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_imports_user_local_date" ON "tb_imports" ("idtb_users", "local_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_imports_user_created" ON "tb_imports" ("idtb_users", "created_at")`,
    );
    await queryRunner.query(`DROP TABLE "tb_profiles"`);
  }
}

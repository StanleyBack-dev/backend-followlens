import type { MigrationInterface, QueryRunner } from "typeorm";

// Scheduled account deletion: the request stamps both columns, and the daily
// purge removes the rows whose grace period has ended.
export class AddAccountDeletion1791100000000 implements MigrationInterface {
  name = "AddAccountDeletion1791100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_users"
        ADD COLUMN IF NOT EXISTS "deletion_requested_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "deletion_scheduled_for" timestamptz NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_deletion_due"
        ON "tb_users" ("deletion_scheduled_for")
        WHERE "deletion_scheduled_for" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_deletion_due"`);
    await queryRunner.query(`
      ALTER TABLE "tb_users"
        DROP COLUMN IF EXISTS "deletion_scheduled_for",
        DROP COLUMN IF EXISTS "deletion_requested_at"
    `);
  }
}

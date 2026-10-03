import type { MigrationInterface, QueryRunner } from "typeorm";

// Databases created before roles existed get the column here; fresh ones
// already have it from InitialSchema, so every statement is idempotent.
export class AddUserRole1791000000000 implements MigrationInterface {
  name = "AddUserRole1791000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_users"
        ADD COLUMN IF NOT EXISTS "role" varchar(8) NOT NULL DEFAULT 'user'
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_tb_users_role'
        ) THEN
          ALTER TABLE "tb_users"
            ADD CONSTRAINT "chk_tb_users_role" CHECK ("role" IN ('user', 'admin'));
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tb_users" DROP CONSTRAINT IF EXISTS "chk_tb_users_role"`,
    );
  }
}

import type { MigrationInterface, QueryRunner } from "typeorm";

// Referral program (a paid referral earns the referrer Pro days) and the
// bookkeeping of the monthly summary e-mail.
export class AddReferralsAndEngagement1791500000000 implements MigrationInterface {
  name = "AddReferralsAndEngagement1791500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_users"
        ADD COLUMN IF NOT EXISTS "pro_bonus_until" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "referral_code" varchar(12) NULL,
        ADD COLUMN IF NOT EXISTS "referred_by_user_id" uuid NULL
          REFERENCES "tb_users" ("idtb_users") ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "referral_qualified_at" timestamptz NULL
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_referral_code" ON "tb_users" ("referral_code") WHERE "referral_code" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_referred_by" ON "tb_users" ("referred_by_user_id") WHERE "referred_by_user_id" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tb_referral_rewards" (
        "idtb_referral_rewards" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "referred_user_id" uuid NOT NULL,
        "days" integer NOT NULL,
        "applied_as" varchar(24) NOT NULL
          CHECK ("applied_as" IN ('pro_bonus', 'postponed_charge')),
        "revoked_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_referral_rewards_referred" ON "tb_referral_rewards" ("referred_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_rewards_user" ON "tb_referral_rewards" ("idtb_users")`,
    );

    // One row per time a referral link is opened. Deliberately anonymous:
    // only whose link it was and when.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tb_referral_clicks" (
        "idtb_referral_clicks" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "clicked_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_clicks_user_clicked" ON "tb_referral_clicks" ("idtb_users", "clicked_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tb_monthly_summary_emails" (
        "idtb_profiles" uuid NOT NULL REFERENCES "tb_profiles" ("idtb_profiles") ON DELETE CASCADE,
        "month" char(7) NOT NULL,
        "sent_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("idtb_profiles", "month")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_monthly_summary_emails"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_referral_clicks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_referral_rewards"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_referred_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_referral_code"`);
    await queryRunner.query(`
      ALTER TABLE "tb_users"
        DROP COLUMN IF EXISTS "referral_qualified_at",
        DROP COLUMN IF EXISTS "referred_by_user_id",
        DROP COLUMN IF EXISTS "referral_code",
        DROP COLUMN IF EXISTS "pro_bonus_until"
    `);
  }
}

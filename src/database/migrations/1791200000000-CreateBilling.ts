import type { MigrationInterface, QueryRunner } from "typeorm";

// Pro subscriptions billed through the payment gateway. The effective plan
// stays on tb_users.plan; these tables track the paid subscription behind it.
export class CreateBilling1791200000000 implements MigrationInterface {
  name = "CreateBilling1791200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tb_subscriptions" (
        "idtb_subscriptions" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "status" varchar(16) NOT NULL DEFAULT 'pending'
          CHECK ("status" IN ('pending', 'active', 'past_due', 'canceled', 'expired')),
        "billing_cycle" varchar(8) NULL CHECK ("billing_cycle" IN ('monthly', 'yearly')),
        "payment_method" varchar(16) NULL CHECK ("payment_method" IN ('checkout', 'pix_automatic')),
        "pro_started_at" timestamptz NULL,
        "current_period_end" timestamptz NULL,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "gateway_customer_id" varchar(64) NULL,
        "gateway_subscription_id" varchar(64) NULL,
        "gateway_pix_authorization_id" varchar(64) NULL,
        "past_due_since" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_subscriptions_user" ON "tb_subscriptions" ("idtb_users")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_subscriptions_gateway_subscription" ON "tb_subscriptions" ("gateway_subscription_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_subscriptions_gateway_pix" ON "tb_subscriptions" ("gateway_pix_authorization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_subscriptions_status" ON "tb_subscriptions" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tb_billing_payments" (
        "idtb_billing_payments" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "gateway_payment_id" varchar(64) NOT NULL,
        "amount" numeric(12, 2) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'pending'
          CHECK ("status" IN ('pending', 'confirmed', 'received', 'overdue', 'refunded', 'deleted')),
        "due_date" date NULL,
        "paid_at" timestamptz NULL,
        "invoice_url" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_billing_payments_gateway" ON "tb_billing_payments" ("gateway_payment_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_payments_user_created" ON "tb_billing_payments" ("idtb_users", "created_at")`,
    );

    // Kept after the account is gone (no FK): the survey is product feedback.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tb_subscription_cancellations" (
        "idtb_subscription_cancellations" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL,
        "email" varchar(160) NOT NULL,
        "reasons" jsonb NOT NULL,
        "other_reason" varchar(500) NULL,
        "billing_cycle" varchar(8) NULL,
        "pro_started_at" timestamptz NULL,
        "requested_at" timestamptz NOT NULL,
        "effective_at" timestamptz NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "tb_subscription_cancellations"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_billing_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_subscriptions"`);
  }
}

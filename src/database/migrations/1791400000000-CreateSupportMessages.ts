import type { MigrationInterface, QueryRunner } from "typeorm";

// Support tickets: one message from the user, one reply from the team, then
// the ticket is finalized. The protocol number is what both sides quote.
export class CreateSupportMessages1791400000000 implements MigrationInterface {
  name = "CreateSupportMessages1791400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tb_support_messages" (
        "idtb_support_messages" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idtb_users" uuid NOT NULL REFERENCES "tb_users" ("idtb_users") ON DELETE CASCADE,
        "protocol_number" integer GENERATED ALWAYS AS IDENTITY,
        "category" varchar(24) NOT NULL
          CHECK ("category" IN ('doubt', 'technical_issue', 'suggestion', 'billing', 'other')),
        "message" varchar(2000) NOT NULL,
        "status" varchar(12) NOT NULL DEFAULT 'open'
          CHECK ("status" IN ('open', 'answered', 'resolved')),
        "admin_reply" varchar(2000) NULL,
        "replied_at" timestamptz NULL,
        "replied_by_admin_id" uuid NULL,
        "finalized_at" timestamptz NULL,
        "finalized_by_admin_id" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_support_messages_protocol" ON "tb_support_messages" ("protocol_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_support_messages_user_created" ON "tb_support_messages" ("idtb_users", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_support_messages_status_created" ON "tb_support_messages" ("status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tb_support_messages"`);
  }
}

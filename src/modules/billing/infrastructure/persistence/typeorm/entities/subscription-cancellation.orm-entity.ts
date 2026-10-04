import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";
import type { CancellationReason } from "@/modules/billing/domain/enums/cancellation-reason.enum";

// Exit survey answered when a user cancels. Not tied to the user row by a
// foreign key, so it survives the account being deleted.
@Entity("tb_subscription_cancellations")
export class SubscriptionCancellationOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_subscription_cancellations" })
  id!: string;

  @Column({ name: "idtb_users", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 160 })
  email!: string;

  @Column({ type: "jsonb" })
  reasons!: CancellationReason[];

  @Column({
    name: "other_reason",
    type: "varchar",
    length: 500,
    nullable: true,
  })
  otherReason!: string | null;

  @Column({ name: "billing_cycle", type: "varchar", length: 8, nullable: true })
  billingCycle!: BillingCycle | null;

  @Column({ name: "pro_started_at", type: "timestamptz", nullable: true })
  proStartedAt!: Date | null;

  @Column({ name: "requested_at", type: "timestamptz" })
  requestedAt!: Date;

  @Column({ name: "effective_at", type: "timestamptz" })
  effectiveAt!: Date;
}

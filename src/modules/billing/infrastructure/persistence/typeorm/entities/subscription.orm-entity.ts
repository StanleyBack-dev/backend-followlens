import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";
import type { PaymentMethod } from "@/modules/billing/domain/enums/payment-method.enum";
import { SubscriptionStatus } from "@/modules/billing/domain/enums/subscription-status.enum";

// One row per user that ever started a checkout. The effective plan lives on
// the user; this tracks the paid subscription that grants it.
@Entity("tb_subscriptions")
export class SubscriptionOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_subscriptions" })
  id!: string;

  @Column({ name: "idtb_users", type: "uuid" })
  @Index("UQ_subscriptions_user", { unique: true })
  userId!: string;

  @Column({ type: "varchar", length: 16, default: SubscriptionStatus.PENDING })
  status!: SubscriptionStatus;

  @Column({ name: "billing_cycle", type: "varchar", length: 8, nullable: true })
  billingCycle!: BillingCycle | null;

  @Column({
    name: "payment_method",
    type: "varchar",
    length: 16,
    nullable: true,
  })
  paymentMethod!: PaymentMethod | null;

  @Column({ name: "pro_started_at", type: "timestamptz", nullable: true })
  proStartedAt!: Date | null;

  @Column({ name: "current_period_end", type: "timestamptz", nullable: true })
  currentPeriodEnd!: Date | null;

  @Column({ name: "cancel_at_period_end", type: "boolean", default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({
    name: "gateway_customer_id",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  gatewayCustomerId!: string | null;

  @Column({
    name: "gateway_subscription_id",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  gatewaySubscriptionId!: string | null;

  @Column({
    name: "gateway_pix_authorization_id",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  gatewayPixAuthorizationId!: string | null;

  @Column({ name: "past_due_since", type: "timestamptz", nullable: true })
  pastDueSince!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

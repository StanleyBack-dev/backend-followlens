export enum SubscriptionStatus {
  /** Checkout started; waiting for the first payment. */
  PENDING = "pending",
  ACTIVE = "active",
  /** A charge is overdue; Pro is kept during the grace period. */
  PAST_DUE = "past_due",
  CANCELED = "canceled",
  /** Downgraded after the overdue grace period ran out. */
  EXPIRED = "expired",
}

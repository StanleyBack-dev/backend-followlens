/** How the Pro days were handed to the referrer. */
export enum RewardApplication {
  /** Added to the user's time-limited Pro. */
  PRO_BONUS = "pro_bonus",
  /** The paying referrer's next charge was pushed forward. */
  POSTPONED_CHARGE = "postponed_charge",
}

export type ReferralRewardView = {
  id: string;
  referrerId: string;
  referredUserId: string;
  days: number;
  appliedAs: RewardApplication;
  revokedAt: Date | null;
  createdAt: Date;
};

export type RecordRewardInput = {
  referrerId: string;
  referredUserId: string;
  days: number;
  appliedAs: RewardApplication;
};

export interface ReferralRewardRepositoryPort {
  record(input: RecordRewardInput): Promise<ReferralRewardView>;
  listByReferrer(referrerId: string): Promise<ReferralRewardView[]>;
  /** The reward earned from this referred user that is still standing. */
  findActiveByReferred(
    referredUserId: string,
  ): Promise<ReferralRewardView | null>;
  markRevoked(rewardId: string, at: Date): Promise<void>;
}

export const REFERRAL_REWARD_REPOSITORY = Symbol("REFERRAL_REWARD_REPOSITORY");

export type ReferralClickStats = {
  total: number;
  /** Clicks from `since` on. */
  recent: number;
  /** Newest first. */
  latest: Date[];
};

export interface ReferralClickRepositoryPort {
  record(referrerId: string, at: Date): Promise<void>;
  stats(
    referrerId: string,
    since: Date,
    latestLimit: number,
  ): Promise<ReferralClickStats>;
}

export const REFERRAL_CLICK_REPOSITORY = Symbol("REFERRAL_CLICK_REPOSITORY");

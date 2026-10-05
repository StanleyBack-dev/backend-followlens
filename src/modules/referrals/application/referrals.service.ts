import { randomInt } from "crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type RecordRewardInput,
  REFERRAL_CLICK_REPOSITORY,
  REFERRAL_REWARD_REPOSITORY,
  type ReferralClickRepositoryPort,
  type ReferralRewardRepositoryPort,
  type ReferralRewardView,
} from "@/modules/referrals/application/ports/referral-reward-repository.port";
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from "@/modules/users/application/ports/user-repository.port";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// No 0/O/1/I: the code is read aloud and typed by hand.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const CODE_ATTEMPTS = 5;
const DAY_MS = 86_400_000;
const RECENT_CLICK_DAYS = 7;
const LATEST_CLICKS = 20;

export type ReferredFriend = {
  /** First name only: the referrer sees who joined, not their contact. */
  name: string;
  joinedAt: Date;
  /** Paid a first subscription, which is what earns the reward. */
  qualified: boolean;
};

export type ReferralOverview = {
  code: string;
  rewardDays: number;
  /** Times the link was opened. */
  clicks: number;
  clicksLast7Days: number;
  /** When the latest clicks happened, newest first. */
  latestClicks: Date[];
  invited: number;
  qualified: number;
  daysEarned: number;
  proBonusUntil: Date | null;
  friends: ReferredFriend[];
};

// Who invited whom, and what each paid referral earned. Handing out the Pro
// days themselves is the billing context's job.
@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(REFERRAL_REWARD_REPOSITORY)
    private readonly rewards: ReferralRewardRepositoryPort,
    @Inject(REFERRAL_CLICK_REPOSITORY)
    private readonly clicks: ReferralClickRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly config: ConfigService,
  ) {}

  rewardDays(): number {
    return this.config.get<number>("REFERRAL_REWARD_DAYS") ?? 30;
  }

  async overview(userId: string): Promise<ReferralOverview> {
    const [code, user, referred, rewards, clicks] = await Promise.all([
      this.codeOf(userId),
      this.users.findById(userId),
      this.users.listReferredBy(userId),
      this.rewards.listByReferrer(userId),
      this.clicks.stats(
        userId,
        new Date(this.clock.now().getTime() - RECENT_CLICK_DAYS * DAY_MS),
        LATEST_CLICKS,
      ),
    ]);
    const standing = rewards.filter((reward) => reward.revokedAt === null);
    return {
      code,
      rewardDays: this.rewardDays(),
      clicks: clicks.total,
      clicksLast7Days: clicks.recent,
      latestClicks: clicks.latest,
      invited: referred.length,
      qualified: standing.length,
      daysEarned: standing.reduce((total, reward) => total + reward.days, 0),
      proBonusUntil: user?.proBonusUntil ?? null,
      friends: referred.map((friend) => ({
        name: friend.name.trim().split(" ")[0] || "Convidado",
        joinedAt: friend.createdAt,
        qualified: friend.referralQualifiedAt !== null,
      })),
    };
  }

  /** The user's code, created the first time it is needed. */
  async codeOf(userId: string): Promise<string> {
    const user = await this.users.findById(userId);
    if (user?.referralCode) return user.referralCode;
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = newCode();
      if (await this.users.setReferralCode(userId, code)) return code;
    }
    throw new Error("Não foi possível gerar um código de indicação");
  }

  /** Counts one opening of a referral link. Unknown codes are ignored. */
  async recordClick(code: string): Promise<void> {
    const referrer = await this.users.findByReferralCode(code);
    if (referrer) await this.clicks.record(referrer.id, this.clock.now());
  }

  /**
   * Links a just-created account to whoever invited it. Never throws: a bad
   * code must not get in the way of signing up.
   */
  async attribute(newUserId: string, code: string | undefined): Promise<void> {
    if (!code) return;
    try {
      const referrer = await this.users.findByReferralCode(code);
      if (referrer && referrer.id !== newUserId) {
        await this.users.setReferredBy(newUserId, referrer.id);
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao atribuir a indicação do usuário ${newUserId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Called when a user's first payment settles. Returns the referrer to
   * reward, once per referred user; null when there is nothing to reward.
   */
  async qualify(referredUserId: string): Promise<string | null> {
    const referred = await this.users.findById(referredUserId);
    if (!referred?.referredByUserId || referred.referralQualifiedAt) {
      return null;
    }
    await this.users.markReferralQualified(referredUserId, this.clock.now());
    return referred.referredByUserId;
  }

  recordReward(input: RecordRewardInput): Promise<ReferralRewardView> {
    return this.rewards.record(input);
  }

  /** Takes back the reward earned from a referred user (payment refunded). */
  async revokeRewardFrom(
    referredUserId: string,
  ): Promise<ReferralRewardView | null> {
    const reward = await this.rewards.findActiveByReferred(referredUserId);
    if (!reward) return null;
    await this.rewards.markRevoked(reward.id, this.clock.now());
    return reward;
  }
}

function newCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

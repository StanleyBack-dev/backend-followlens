import type { WeeklyStreak } from "@/modules/engagement/domain/weekly-streak";

export enum AchievementKey {
  FIRST_IMPORT = "first_import",
  FIRST_COMPARISON = "first_comparison",
  IMPORTS_10 = "imports_10",
  IMPORTS_25 = "imports_25",
  STREAK_4 = "streak_4",
  STREAK_12 = "streak_12",
  FOLLOWERS_1K = "followers_1k",
  FOLLOWERS_5K = "followers_5k",
  FOLLOWERS_10K = "followers_10k",
  FIRST_REFERRAL = "first_referral",
}

export type Achievement = {
  key: AchievementKey;
  unlocked: boolean;
  /** Known for milestones tied to a specific import. */
  unlockedAt: Date | null;
  current: number;
  target: number;
};

export type AchievementImport = {
  createdAt: Date;
  followersCount: number | null;
};

export type AchievementInput = {
  /** Completed imports of the profile, oldest first. */
  imports: AchievementImport[];
  streak: WeeklyStreak;
  /** Referrals of the account that became paid subscriptions. */
  paidReferrals: number;
};

export function computeAchievements(input: AchievementInput): Achievement[] {
  const { imports, streak, paidReferrals } = input;
  const peakFollowers = imports.reduce(
    (peak, item) => Math.max(peak, item.followersCount ?? 0),
    0,
  );

  const byImportCount = (key: AchievementKey, target: number): Achievement => ({
    key,
    unlocked: imports.length >= target,
    unlockedAt: imports[target - 1]?.createdAt ?? null,
    current: Math.min(imports.length, target),
    target,
  });
  const byFollowers = (key: AchievementKey, target: number): Achievement => ({
    key,
    unlocked: peakFollowers >= target,
    unlockedAt:
      imports.find((item) => (item.followersCount ?? 0) >= target)?.createdAt ??
      null,
    current: Math.min(peakFollowers, target),
    target,
  });
  const byStreak = (key: AchievementKey, target: number): Achievement => ({
    key,
    unlocked: streak.best >= target,
    unlockedAt: null,
    current: Math.min(Math.max(streak.current, streak.best), target),
    target,
  });

  return [
    byImportCount(AchievementKey.FIRST_IMPORT, 1),
    byImportCount(AchievementKey.FIRST_COMPARISON, 2),
    byImportCount(AchievementKey.IMPORTS_10, 10),
    byImportCount(AchievementKey.IMPORTS_25, 25),
    byStreak(AchievementKey.STREAK_4, 4),
    byStreak(AchievementKey.STREAK_12, 12),
    byFollowers(AchievementKey.FOLLOWERS_1K, 1_000),
    byFollowers(AchievementKey.FOLLOWERS_5K, 5_000),
    byFollowers(AchievementKey.FOLLOWERS_10K, 10_000),
    {
      key: AchievementKey.FIRST_REFERRAL,
      unlocked: paidReferrals >= 1,
      unlockedAt: null,
      current: Math.min(paidReferrals, 1),
      target: 1,
    },
  ];
}

import {
  AchievementKey,
  computeAchievements,
} from "@/modules/engagement/domain/achievements";
import { addMonths } from "@/modules/engagement/domain/month";
import { computeWeeklyStreak } from "@/modules/engagement/domain/weekly-streak";

describe("computeWeeklyStreak", () => {
  it("has no streak without imports", () => {
    expect(computeWeeklyStreak([], "2026-10-07")).toEqual({
      current: 0,
      best: 0,
      activeThisWeek: false,
    });
  });

  it("counts consecutive weeks, several imports in a week counting once", () => {
    // Mondays: 2026-09-21, 09-28, 10-05.
    const streak = computeWeeklyStreak(
      ["2026-09-22", "2026-09-24", "2026-09-30", "2026-10-06"],
      "2026-10-07",
    );
    expect(streak).toEqual({ current: 3, best: 3, activeThisWeek: true });
  });

  it("keeps the streak alive during the week after the last import", () => {
    const streak = computeWeeklyStreak(
      ["2026-09-22", "2026-09-30"],
      "2026-10-07",
    );
    expect(streak).toEqual({ current: 2, best: 2, activeThisWeek: false });
  });

  it("breaks after a full week without importing, keeping the best run", () => {
    const streak = computeWeeklyStreak(
      ["2026-08-04", "2026-08-11", "2026-08-18", "2026-09-22"],
      "2026-10-07",
    );
    expect(streak).toEqual({ current: 0, best: 3, activeThisWeek: false });
  });

  it("treats Sunday and the next Monday as different weeks", () => {
    const streak = computeWeeklyStreak(
      ["2026-10-04", "2026-10-05"],
      "2026-10-05",
    );
    expect(streak.current).toBe(2);
  });
});

describe("computeAchievements", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 8, day));
  const unlocked = (input: Parameters<typeof computeAchievements>[0]) =>
    computeAchievements(input)
      .filter((achievement) => achievement.unlocked)
      .map((achievement) => achievement.key);

  it("unlocks import milestones with the date of the import that hit them", () => {
    const achievements = computeAchievements({
      imports: [
        { createdAt: at(1), followersCount: 900 },
        { createdAt: at(8), followersCount: 1_050 },
      ],
      streak: { current: 2, best: 2, activeThisWeek: true },
      paidReferrals: 0,
    });
    const byKey = new Map(achievements.map((item) => [item.key, item]));

    expect(byKey.get(AchievementKey.FIRST_COMPARISON)).toMatchObject({
      unlocked: true,
      unlockedAt: at(8),
    });
    expect(byKey.get(AchievementKey.FOLLOWERS_1K)).toMatchObject({
      unlocked: true,
      unlockedAt: at(8),
    });
    expect(byKey.get(AchievementKey.IMPORTS_10)).toMatchObject({
      unlocked: false,
      current: 2,
      target: 10,
    });
  });

  it("unlocks streak and referral achievements", () => {
    expect(
      unlocked({
        imports: [],
        streak: { current: 0, best: 4, activeThisWeek: false },
        paidReferrals: 1,
      }),
    ).toEqual([AchievementKey.STREAK_4, AchievementKey.FIRST_REFERRAL]);
  });
});

describe("addMonths", () => {
  it("moves across year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });
});

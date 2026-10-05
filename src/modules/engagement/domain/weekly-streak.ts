export type WeeklyStreak = {
  /** Consecutive weeks with an import, counting back from now. */
  current: number;
  best: number;
  /** Whether the current week already has an import. */
  activeThisWeek: boolean;
};

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

// Monday of the week a calendar date (YYYY-MM-DD) falls in, as a day count.
function weekOf(localDate: string): number {
  const [year, month, day] = localDate.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const weekday = (new Date(utc).getUTCDay() + 6) % 7;
  return (utc - weekday * DAY_MS) / WEEK_MS;
}

/**
 * Weeks in a row with at least one import. The streak is still alive during
 * the week after the last import, so it only breaks after a full week missed.
 */
export function computeWeeklyStreak(
  importDates: string[],
  today: string,
): WeeklyStreak {
  const weeks = [...new Set(importDates.map(weekOf))].sort((a, b) => a - b);
  if (weeks.length === 0) return { current: 0, best: 0, activeThisWeek: false };

  let best = 1;
  let run = 1;
  for (let i = 1; i < weeks.length; i += 1) {
    run = weeks[i] === weeks[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const thisWeek = weekOf(today);
  const last = weeks[weeks.length - 1];
  const activeThisWeek = last === thisWeek;
  if (!activeThisWeek && last !== thisWeek - 1) {
    return { current: 0, best, activeThisWeek: false };
  }

  let current = 1;
  for (let i = weeks.length - 1; i > 0; i -= 1) {
    if (weeks[i - 1] !== weeks[i] - 1) break;
    current += 1;
  }
  return { current, best, activeThisWeek };
}

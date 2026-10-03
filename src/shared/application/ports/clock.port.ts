export interface ClockPort {
  now(): Date;
  /** Suspends execution (abstracted so the sync engine is testable). */
  sleep(ms: number): Promise<void>;
  /** Calendar date (YYYY-MM-DD) of `date` in the app timezone. */
  localDate(date?: Date): string;
  /** First instant of the next calendar day in the app timezone. */
  startOfNextLocalDay(date?: Date): Date;
}

export const CLOCK = Symbol("CLOCK");

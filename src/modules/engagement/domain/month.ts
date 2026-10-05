const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): boolean {
  return MONTH.test(value);
}

/** YYYY-MM of a calendar date (YYYY-MM-DD). */
export function monthOf(localDate: string): string {
  return localDate.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function firstDayOf(month: string): string {
  return `${month}-01`;
}

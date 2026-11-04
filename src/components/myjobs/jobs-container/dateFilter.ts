// Pure helpers for the Created date filter on the jobs list.
//
// Every boundary is built from a local-time `Date` and then serialised with
// toISOString, so "4 November" means the viewer's 4 November, not UTC's. The
// server deliberately does no date arithmetic — it has no way to know the
// browser's offset.

export type DateFilter = {
  year?: number;
  // 1-12, not the 0-11 the Date constructor wants. The conversion happens once,
  // inside buildCreatedRange.
  month?: number;
  day?: number;
};

export type CreatedRange = { from?: string; to?: string };

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Day 0 of the next month is the last day of this one, which handles February
// and leap years without a table.
export const daysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

/**
 * Narrows progressively: a year alone spans that whole year, year+month spans
 * the month, all three span the single day. The window is half-open
 * ([from, to)) so a job created at 23:59:59.999 is included without any
 * end-of-day rounding games.
 */
export const buildCreatedRange = ({
  year,
  month,
  day,
}: DateFilter): CreatedRange => {
  if (!year) return {};

  if (month && day) {
    const from = new Date(year, month - 1, day);
    const to = new Date(year, month - 1, day + 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  if (month) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  return {
    from: new Date(year, 0, 1).toISOString(),
    to: new Date(year + 1, 0, 1).toISOString(),
  };
};

// A day without a month is meaningless, so it's dropped rather than silently
// treated as January. Same for a month without a year.
export const normalizeDateFilter = (filter: DateFilter): DateFilter => {
  if (!filter.year) return {};
  if (!filter.month) return { year: filter.year };
  const month = Math.min(Math.max(filter.month, 1), 12);
  if (!filter.day) return { year: filter.year, month };
  // Switching from 31 March to February would otherwise leave an impossible
  // day selected; clamping keeps the range valid.
  const day = Math.min(Math.max(filter.day, 1), daysInMonth(filter.year, month));
  return { year: filter.year, month, day };
};

export const describeDateFilter = ({ year, month, day }: DateFilter): string | null => {
  if (!year) return null;
  if (month && day) return `${day} ${MONTH_LABELS[month - 1]} ${year}`;
  if (month) return `${MONTH_LABELS[month - 1]} ${year}`;
  return `${year}`;
};

const toInt = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const readDateFilter = (params: {
  get: (key: string) => string | null;
}): DateFilter =>
  normalizeDateFilter({
    year: toInt(params.get("year")),
    month: toInt(params.get("month")),
    day: toInt(params.get("day")),
  });

// Mutates the caller's URLSearchParams so the date params merge with whatever
// other filters are already there instead of replacing them.
export const writeDateFilter = (
  params: URLSearchParams,
  filter: DateFilter,
): URLSearchParams => {
  const { year, month, day } = normalizeDateFilter(filter);
  for (const [key, value] of [
    ["year", year],
    ["month", month],
    ["day", day],
  ] as const) {
    if (value === undefined) params.delete(key);
    else params.set(key, String(value));
  }
  return params;
};

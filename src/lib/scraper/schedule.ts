// Every automation schedule is expressed in Egypt time, pinned here rather
// than inherited from the host. The container's TZ defaults to
// America/Edmonton (docker-compose.yml) and a bare `npm start` picks up
// whatever the machine is set to, so relying on server-local time meant the
// same stored hour pointed at a different real moment on every deployment.
//
// A stored scheduleHour/scheduleMinute is therefore a Cairo wall-clock
// reading: 09:30 means 09:30 in Cairo, whatever the server thinks the time is.
// Egypt observes DST (UTC+2 in winter, UTC+3 from late April to late October),
// which is why the conversion goes through Intl per instant instead of a fixed
// +02:00 offset.
export const SCHEDULE_TIMEZONE = "Africa/Cairo";

// Shown next to times in the UI so nobody has to guess whose clock it is.
export const SCHEDULE_TIMEZONE_LABEL = "Egypt time";

const PART_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: SCHEDULE_TIMEZONE,
  hour12: false,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

// What the Cairo wall clock reads at a given instant.
export function scheduleZoneParts(instant: Date): ZonedParts {
  const parts = PART_FORMATTER.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

// How far ahead of UTC the zone is at `instant`, in milliseconds.
function zoneOffsetMs(instant: Date): number {
  const parts = scheduleZoneParts(instant);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  // Drop sub-second precision on both sides so the subtraction yields a clean
  // offset rather than the offset plus leftover milliseconds.
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// The instant at which the Cairo wall clock reads the given date and time.
//
// Two passes: the first offset is read at the naive guess, which can sit on
// the wrong side of a DST boundary; re-reading it at the corrected instant
// settles it. A third pass would never change the answer, because Egypt's
// transitions are an hour apart at most.
function instantFromZoned(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstPass = new Date(guess - zoneOffsetMs(new Date(guess)));
  return new Date(guess - zoneOffsetMs(firstPass));
}

// The next instant at which the Cairo clock reads scheduleHour:scheduleMinute.
// scheduleMinute defaults to 0 so every automation written before the column
// existed keeps its original time.
export function calculateNextRunAt(
  scheduleHour: number,
  scheduleMinute = 0,
): Date {
  const now = new Date();
  const today = scheduleZoneParts(now);

  // Walk forward by Cairo calendar days, not by adding 24h to an instant — a
  // DST transition makes one of those days 23 or 25 hours long. Three days of
  // headroom covers a slot that the spring-forward skips entirely.
  for (let offset = 0; offset < 3; offset++) {
    const day = new Date(
      Date.UTC(today.year, today.month - 1, today.day + offset),
    );
    const candidate = instantFromZoned(
      day.getUTCFullYear(),
      day.getUTCMonth() + 1,
      day.getUTCDate(),
      scheduleHour,
      scheduleMinute,
    );
    if (candidate > now) return candidate;
  }

  // Unreachable in practice; returning the last candidate beats returning
  // undefined and having the caller write a null nextRunAt.
  return instantFromZoned(
    today.year,
    today.month,
    today.day + 3,
    scheduleHour,
    scheduleMinute,
  );
}

export function isAutomationDue(nextRunAt: Date | null): boolean {
  if (!nextRunAt) return false;
  return new Date() >= nextRunAt;
}

// One place to render a slot, so the wizard, the review step, the row and the
// detail card can't drift into showing different times for the same record.
export function formatScheduleTime(
  scheduleHour: number,
  scheduleMinute = 0,
): string {
  return `${scheduleHour.toString().padStart(2, "0")}:${scheduleMinute
    .toString()
    .padStart(2, "0")}`;
}

const INSTANT_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: SCHEDULE_TIMEZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

// Renders a stored instant (nextRunAt, lastRunAt) on the Cairo clock. The
// browser's own zone is deliberately ignored: a run time that reads 09:30 in
// the schedule picker must read 09:30 here too, even for someone looking at
// the dashboard from another country.
export function formatScheduleInstant(instant: Date | string): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  return INSTANT_FORMATTER.format(date);
}

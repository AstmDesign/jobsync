import {
  calculateNextRunAt,
  formatScheduleInstant,
  formatScheduleTime,
  isAutomationDue,
  scheduleZoneParts,
  SCHEDULE_TIMEZONE,
} from "@/lib/scraper/schedule";

// Every assertion here goes through scheduleZoneParts or an explicit UTC
// instant, never getHours()/getDate(). Those read the *host* zone, and
// vitest.config.ts does not pin TZ — so a spec written that way passes in
// Cairo and fails in CI. Schedules are Cairo wall-clock readings, so Cairo is
// what the test must look at.
function cairo(date: Date) {
  const parts = scheduleZoneParts(date);
  return {
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function at(utcIso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(utcIso));
}

describe("calculateNextRunAt", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lands on today's slot when it is still ahead", () => {
    // 06:00Z in November is 08:00 in Cairo (UTC+2, no DST).
    at("2026-11-10T06:00:00Z");

    const next = calculateNextRunAt(9, 30);

    expect(cairo(next)).toEqual({ day: 10, hour: 9, minute: 30, second: 0 });
    // Pinned absolutely as well, so a broken offset can't hide behind a
    // helper that is itself wrong.
    expect(next.toISOString()).toBe("2026-11-10T07:30:00.000Z");
  });

  it("rolls to tomorrow once the slot has passed", () => {
    at("2026-11-10T07:31:00Z"); // 09:31 Cairo

    const next = calculateNextRunAt(9, 30);

    expect(cairo(next)).toEqual({ day: 11, hour: 9, minute: 30, second: 0 });
  });

  // The half hour is the whole point of the new column: 09:00 and 09:30 are
  // different slots, and standing at 09:15 only the later one is still ahead.
  it("treats :00 and :30 as separate slots", () => {
    at("2026-11-10T07:15:00Z"); // 09:15 Cairo

    expect(cairo(calculateNextRunAt(9, 0)).day).toBe(11);
    expect(cairo(calculateNextRunAt(9, 30)).day).toBe(10);
  });

  it("handles midnight rather than falling back to another hour", () => {
    at("2026-11-10T21:00:00Z"); // 23:00 Cairo

    const next = calculateNextRunAt(0, 0);

    expect(cairo(next)).toEqual({ day: 11, hour: 0, minute: 0, second: 0 });
    expect(next.toISOString()).toBe("2026-11-10T22:00:00.000Z");
  });

  it("defaults a missing minute to the top of the hour", () => {
    at("2026-11-10T06:00:00Z");

    expect(cairo(calculateNextRunAt(14)).minute).toBe(0);
  });

  // Egypt is UTC+2 in winter and UTC+3 in summer, so a fixed offset would get
  // half the year wrong. The stored slot must read back as the same wall-clock
  // time in both seasons.
  it("keeps the Cairo wall-clock reading across the DST seasons", () => {
    at("2026-07-01T06:00:00Z"); // 09:00 Cairo, UTC+3

    const summer = calculateNextRunAt(14, 30);
    expect(cairo(summer)).toEqual({ day: 1, hour: 14, minute: 30, second: 0 });
    expect(summer.toISOString()).toBe("2026-07-01T11:30:00.000Z");

    vi.setSystemTime(new Date("2026-12-01T06:00:00Z")); // 08:00 Cairo, UTC+2

    const winter = calculateNextRunAt(14, 30);
    expect(cairo(winter)).toEqual({ day: 1, hour: 14, minute: 30, second: 0 });
    expect(winter.toISOString()).toBe("2026-12-01T12:30:00.000Z");
  });

  // Blanket cover rather than hand-picked transition dates: tzdata moves, and
  // a spec that hardcodes "the last Friday of April" rots. Every slot on both
  // sides of the year must survive the round trip.
  it("round-trips every slot in both seasons", () => {
    for (const systemTime of ["2026-02-15T00:00:00Z", "2026-08-15T00:00:00Z"]) {
      at(systemTime);
      for (let hour = 0; hour < 24; hour++) {
        for (const minute of [0, 30] as const) {
          const next = calculateNextRunAt(hour, minute);
          expect(next.getTime()).toBeGreaterThan(Date.now());
          const parts = cairo(next);
          expect({ hour: parts.hour, minute: parts.minute }).toEqual({
            hour,
            minute,
          });
        }
      }
    }
  });
});

describe("formatScheduleTime", () => {
  it("zero-pads both halves", () => {
    expect(formatScheduleTime(9, 0)).toBe("09:00");
    expect(formatScheduleTime(9, 30)).toBe("09:30");
    expect(formatScheduleTime(0, 0)).toBe("00:00");
    expect(formatScheduleTime(23, 30)).toBe("23:30");
  });

  it("defaults a missing minute to :00", () => {
    expect(formatScheduleTime(7)).toBe("07:00");
  });
});

describe("scheduleZoneParts", () => {
  it("reads the Cairo clock, not the host clock", () => {
    expect(scheduleZoneParts(new Date("2026-11-10T07:30:00Z"))).toEqual({
      year: 2026,
      month: 11,
      day: 10,
      hour: 9,
      minute: 30,
      second: 0,
    });
  });

  it("is pinned to Africa/Cairo", () => {
    expect(SCHEDULE_TIMEZONE).toBe("Africa/Cairo");
  });
});

describe("formatScheduleInstant", () => {
  it("renders a stored instant on the Cairo clock", () => {
    // 07:30Z is 09:30 in Cairo in November. A browser in Edmonton must still
    // be shown 9:30 AM, because that is the time the picker offered.
    expect(formatScheduleInstant(new Date("2026-11-10T07:30:00Z"))).toContain(
      "9:30",
    );
  });

  it("accepts an ISO string as well as a Date", () => {
    expect(formatScheduleInstant("2026-11-10T07:30:00Z")).toBe(
      formatScheduleInstant(new Date("2026-11-10T07:30:00Z")),
    );
  });
});

describe("isAutomationDue", () => {
  it("is never due without a next run", () => {
    expect(isAutomationDue(null)).toBe(false);
  });

  it("is due once the slot has arrived", () => {
    expect(isAutomationDue(new Date(Date.now() - 1000))).toBe(true);
    expect(isAutomationDue(new Date(Date.now() + 60_000))).toBe(false);
  });
});

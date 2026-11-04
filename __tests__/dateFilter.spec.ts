import {
  buildCreatedRange,
  daysInMonth,
  describeDateFilter,
  normalizeDateFilter,
  readDateFilter,
  writeDateFilter,
} from "@/components/myjobs/jobs-container/dateFilter";

// The helper builds boundaries from local-time Dates on purpose, so the
// assertions compare against locally-constructed Dates rather than hard-coded
// UTC strings — otherwise the suite would only pass in one timezone.
const localIso = (
  year: number,
  month: number,
  day: number,
) => new Date(year, month - 1, day).toISOString();

describe("buildCreatedRange", () => {
  it("returns nothing without a year", () => {
    expect(buildCreatedRange({})).toEqual({});
    expect(buildCreatedRange({ month: 11, day: 4 })).toEqual({});
  });

  it("spans the whole year when only a year is picked", () => {
    expect(buildCreatedRange({ year: 2026 })).toEqual({
      from: localIso(2026, 1, 1),
      to: localIso(2027, 1, 1),
    });
  });

  it("spans the month when a month is picked", () => {
    expect(buildCreatedRange({ year: 2026, month: 11 })).toEqual({
      from: localIso(2026, 11, 1),
      to: localIso(2026, 12, 1),
    });
  });

  it("spans a single day when all three are picked", () => {
    expect(buildCreatedRange({ year: 2026, month: 11, day: 4 })).toEqual({
      from: localIso(2026, 11, 4),
      to: localIso(2026, 11, 5),
    });
  });

  it("rolls over the month end rather than producing an invalid date", () => {
    // Day 31 + 1 in December has to become 1 January, not 32 December.
    expect(buildCreatedRange({ year: 2026, month: 12, day: 31 })).toEqual({
      from: localIso(2026, 12, 31),
      to: localIso(2027, 1, 1),
    });
  });

  it("builds a half-open window, so the last millisecond of the day is inside", () => {
    const { from, to } = buildCreatedRange({ year: 2026, month: 11, day: 4 });
    const endOfDay = new Date(2026, 10, 4, 23, 59, 59, 999);
    expect(endOfDay >= new Date(from!)).toBe(true);
    expect(endOfDay < new Date(to!)).toBe(true);
  });
});

describe("daysInMonth", () => {
  it("knows the short months and leap years", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe("normalizeDateFilter", () => {
  it("drops a month or day left stranded without the level above", () => {
    expect(normalizeDateFilter({ month: 11, day: 4 })).toEqual({});
    expect(normalizeDateFilter({ year: 2026, day: 4 })).toEqual({
      year: 2026,
    });
  });

  it("clamps a day the new month doesn't have", () => {
    // Switching 31 March to February must not leave 31 February selected.
    expect(normalizeDateFilter({ year: 2026, month: 2, day: 31 })).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    });
  });

  it("clamps an out-of-range month", () => {
    expect(normalizeDateFilter({ year: 2026, month: 13 })).toEqual({
      year: 2026,
      month: 12,
    });
  });
});

describe("describeDateFilter", () => {
  it("labels each level of narrowing", () => {
    expect(describeDateFilter({})).toBeNull();
    expect(describeDateFilter({ year: 2026 })).toBe("2026");
    expect(describeDateFilter({ year: 2026, month: 11 })).toBe(
      "November 2026",
    );
    expect(describeDateFilter({ year: 2026, month: 11, day: 4 })).toBe(
      "4 November 2026",
    );
  });
});

describe("readDateFilter / writeDateFilter", () => {
  it("reads and normalizes the three params", () => {
    const params = new URLSearchParams("year=2026&month=11&day=4");
    expect(readDateFilter(params)).toEqual({ year: 2026, month: 11, day: 4 });
  });

  it("ignores junk params", () => {
    const params = new URLSearchParams("year=abc&month=11");
    expect(readDateFilter(params)).toEqual({});
  });

  it("merges into an existing query string instead of replacing it", () => {
    const params = new URLSearchParams("matchResume=resume-1");
    writeDateFilter(params, { year: 2026, month: 11 });
    expect(params.get("matchResume")).toBe("resume-1");
    expect(params.get("year")).toBe("2026");
    expect(params.get("month")).toBe("11");
    expect(params.has("day")).toBe(false);
  });

  it("removes the date params when the filter is cleared", () => {
    const params = new URLSearchParams(
      "matchResume=resume-1&year=2026&month=11&day=4",
    );
    writeDateFilter(params, {});
    expect(params.toString()).toBe("matchResume=resume-1");
  });
});

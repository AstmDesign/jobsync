import { buildScheduleSlotBuckets } from "@/components/automations/AutomationScheduleChart";
import type { AutomationWithResume } from "@/models/automation.model";

function automation(
  overrides: Partial<AutomationWithResume> = {},
): AutomationWithResume {
  return {
    id: "auto-1",
    userId: "user-1",
    name: "Rails roles",
    jobBoard: "greenhouse",
    keywords: "ruby",
    location: null,
    sourceConfig: null,
    resumeId: "resume-1",
    matchThreshold: 80,
    scheduleHour: 9,
    scheduleMinute: 0,
    nextRunAt: null,
    lastRunAt: null,
    status: "active",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  } as AutomationWithResume;
}

function slotOf(
  buckets: ReturnType<typeof buildScheduleSlotBuckets>,
  slot: string,
) {
  const bucket = buckets.find((b) => b.slot === slot);
  if (!bucket) throw new Error(`no bucket for ${slot}`);
  return bucket;
}

describe("buildScheduleSlotBuckets", () => {
  it("returns all 48 half-hour slots in order", () => {
    const buckets = buildScheduleSlotBuckets([]);

    expect(buckets).toHaveLength(48);
    expect(buckets.map((b) => b.slot).slice(0, 5)).toEqual([
      "00:00",
      "00:30",
      "01:00",
      "01:30",
      "02:00",
    ]);
    expect(buckets[47].slot).toBe("23:30");
    expect(buckets.every((b) => b.active === 0 && b.paused === 0)).toBe(true);
  });

  // The stored slot is already a Cairo wall-clock reading (see
  // SCHEDULE_TIMEZONE), so the bucket is the stored hour/minute verbatim. If
  // this ever starts shifting, something has reintroduced a conversion.
  it("buckets by the stored slot without shifting it", () => {
    const buckets = buildScheduleSlotBuckets([
      automation({ id: "a", scheduleHour: 0, scheduleMinute: 0 }),
      automation({ id: "b", scheduleHour: 23, scheduleMinute: 30 }),
    ]);

    expect(slotOf(buckets, "00:00").active).toBe(1);
    expect(slotOf(buckets, "23:30").active).toBe(1);
    expect(slotOf(buckets, "00:30").active).toBe(0);
    expect(slotOf(buckets, "23:00").active).toBe(0);
  });

  it("keeps :00 and :30 as separate bars of the same hour", () => {
    const buckets = buildScheduleSlotBuckets([
      automation({ id: "a", scheduleHour: 9, scheduleMinute: 0 }),
      automation({ id: "b", scheduleHour: 9, scheduleMinute: 30 }),
      automation({ id: "c", scheduleHour: 9, scheduleMinute: 30 }),
    ]);

    expect(slotOf(buckets, "09:00").active).toBe(1);
    expect(slotOf(buckets, "09:30").active).toBe(2);
  });

  it("stacks active and paused within a slot", () => {
    const buckets = buildScheduleSlotBuckets([
      automation({ id: "a", scheduleHour: 14, status: "active" }),
      automation({ id: "b", scheduleHour: 14, status: "paused" }),
      automation({ id: "c", scheduleHour: 14, status: "paused" }),
    ]);

    expect(slotOf(buckets, "14:00")).toMatchObject({ active: 1, paused: 2 });
  });

  // A retired board never runs, so counting it would overstate the load on a
  // slot the user can't actually relieve except by deleting the row.
  it("leaves retired boards out", () => {
    const buckets = buildScheduleSlotBuckets([
      automation({ id: "a", scheduleHour: 7, jobBoard: "jsearch" }),
      automation({ id: "b", scheduleHour: 7, jobBoard: "lever" }),
    ]);

    expect(slotOf(buckets, "07:00").active).toBe(1);
  });

  // Defensive: the column is NOT NULL with a 0 default and the schema caps the
  // hour at 23, but a hand-edited or restored row could still be out of range,
  // and buckets[50] would otherwise be undefined.
  it("ignores an out-of-range hour instead of crashing", () => {
    const buckets = buildScheduleSlotBuckets([
      automation({ id: "a", scheduleHour: 25 }),
      automation({ id: "b", scheduleHour: -1 }),
      automation({ id: "c", scheduleHour: 9 }),
    ]);

    expect(buckets).toHaveLength(48);
    expect(buckets.reduce((sum, b) => sum + b.active, 0)).toBe(1);
  });

  // Anything that isn't exactly 30 is the top of the hour, matching how the
  // rest of the app reads the column (`scheduleMinute ?? 0`).
  it("treats a missing minute as the top of the hour", () => {
    const buckets = buildScheduleSlotBuckets([
      automation({
        id: "a",
        scheduleHour: 11,
        scheduleMinute: undefined as unknown as number,
      }),
    ]);

    expect(slotOf(buckets, "11:00").active).toBe(1);
    expect(slotOf(buckets, "11:30").active).toBe(0);
  });
});

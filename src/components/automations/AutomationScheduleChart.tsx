"use client";

import { ResponsiveBar, type BarDatum } from "@nivo/bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutomationWithResume } from "@/models/automation.model";
import { isRetiredBoard } from "@/models/automation.model";
import {
  formatScheduleTime,
  SCHEDULE_TIMEZONE_LABEL,
} from "@/lib/scraper/schedule";

// The two stacked segments of a slot. Active and paused are kept apart so the
// chart answers "what will actually run at 09:30" without hiding the paused
// automations that would land there once resumed.
export const SCHEDULE_CHART_KEYS = ["active", "paused"] as const;

export type ScheduleChartKey = (typeof SCHEDULE_CHART_KEYS)[number];

export const SCHEDULE_CHART_LABELS: Record<ScheduleChartKey, string> = {
  active: "Active",
  paused: "Paused",
};

const SCHEDULE_CHART_COLORS: Record<ScheduleChartKey, string> = {
  active: "#2a7ef0",
  paused: "#94a3b8",
};

export interface ScheduleSlotBucket {
  slot: string;
  hour: number;
  minute: 0 | 30;
  active: number;
  paused: number;
}

// Buckets automations into the 48 half-hour slots of the Egypt day. The axis is
// the slot itself — 00:00, 00:30, 01:00 … — because that is the granularity the
// picker offers, so a bar maps one-to-one onto a choice the user can make.
//
// No timezone conversion happens here, and that is deliberate:
// scheduleHour/scheduleMinute are stored as Cairo wall-clock readings (see
// SCHEDULE_TIMEZONE in lib/scraper/schedule.ts), so the stored slot already is
// the slot this axis shows. Converting would double-apply the offset.
//
// Retired boards are left out — they never run, so counting them would
// overstate the load on their slot.
export function buildScheduleSlotBuckets(
  automations: AutomationWithResume[],
): ScheduleSlotBucket[] {
  const buckets: ScheduleSlotBucket[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30] as const) {
      buckets.push({
        slot: formatScheduleTime(hour, minute),
        hour,
        minute,
        active: 0,
        paused: 0,
      });
    }
  }

  // slot index = hour * 2, plus one for the half hour.
  const indexOf = (hour: number, onTheHalf: boolean) =>
    hour * 2 + (onTheHalf ? 1 : 0);

  for (const automation of automations) {
    if (isRetiredBoard(automation.jobBoard)) continue;

    const hour = automation.scheduleHour;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;

    const bucket = buckets[indexOf(hour, automation.scheduleMinute === 30)];
    const key: ScheduleChartKey =
      automation.status === "active" ? "active" : "paused";
    bucket[key] += 1;
  }

  return buckets;
}

export function AutomationScheduleChart({
  automations,
}: {
  automations: AutomationWithResume[];
}) {
  const data = buildScheduleSlotBuckets(automations);
  const total = data.reduce(
    (sum, bucket) => sum + bucket.active + bucket.paused,
    0,
  );

  // Nothing scheduled means an empty 48-bar frame, which reads as a bug rather
  // than as "you have no automations yet". The list below already says so.
  if (total === 0) return null;

  return (
    <Card className="mb-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Daily run load ({SCHEDULE_TIMEZONE_LABEL})
        </CardTitle>
      </CardHeader>
      {/* 48 slots don't fit a narrow viewport at a legible tick size, so the
          plot keeps a minimum width and the card scrolls sideways instead of
          dropping every other label. */}
      <CardContent className="h-[200px] p-3 pt-0 overflow-x-auto">
        <div className="h-[180px] min-w-[720px]">
          <ResponsiveBar
            data={data as unknown as BarDatum[]}
            keys={[...SCHEDULE_CHART_KEYS]}
            indexBy="slot"
            margin={{ top: 10, right: 10, bottom: 52, left: 32 }}
            padding={0.25}
            groupMode="stacked"
            colors={(bar) =>
              SCHEDULE_CHART_COLORS[bar.id as ScheduleChartKey] ?? "#94a3b8"
            }
            // Counts only — a fractional automation does not exist, and the
            // default tick generator happily emits 0.5 on a short axis.
            valueFormat={(value) => value.toFixed(0)}
            theme={{
              text: { fill: "#9ca3af" },
              tooltip: { container: { background: "#1e293b", color: "#fff" } },
            }}
            axisTop={null}
            axisRight={null}
            enableGridX={false}
            enableGridY={false}
            enableLabel={false}
            axisBottom={{
              tickSize: 4,
              tickPadding: 4,
              // Rotated because every one of the 48 slot labels is shown; at 0°
              // they overlap into mush.
              tickRotation: -60,
              legend: `Run slot (${SCHEDULE_TIMEZONE_LABEL})`,
              legendPosition: "middle",
              legendOffset: 48,
            }}
            axisLeft={{
              tickSize: 4,
              tickPadding: 4,
              tickRotation: 0,
              tickValues: scheduleAxisTicks(data),
            }}
            motionConfig="gentle"
            tooltip={({ id, value, indexValue, color }) => (
              <div
                style={{
                  background: "#1e293b",
                  color: "#fff",
                  padding: "6px 10px",
                  borderRadius: 4,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  {indexValue} {SCHEDULE_TIMEZONE_LABEL}
                </div>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    background: color,
                    borderRadius: 2,
                    marginRight: 6,
                  }}
                />
                {SCHEDULE_CHART_LABELS[id as ScheduleChartKey] ?? String(id)}:{" "}
                <strong>{value}</strong>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Whole-number ticks up to the busiest slot, so a chart whose tallest bar is 2
// doesn't get labelled 0, 0.5, 1, 1.5, 2.
function scheduleAxisTicks(data: ScheduleSlotBucket[]): number[] {
  const max = Math.max(1, ...data.map((b) => b.active + b.paused));
  return Array.from({ length: max + 1 }, (_, i) => i);
}

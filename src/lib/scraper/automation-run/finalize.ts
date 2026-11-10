import db from "@/lib/db";
import type { AutomationRunStatus } from "@/models/automation.model";
import { calculateNextRunAt } from "../schedule";
import type { RunnerResult } from "./types";

export interface FinalizeData {
  status: AutomationRunStatus;
  errorMessage?: string;
  blockedReason?: string;
  funnelStats?: string;
  jobsSearched: number;
  jobsDeduplicated: number;
  jobsProcessed: number;
  jobsMatched: number;
  jobsSaved: number;
}

export async function finalizeRun(
  runId: string,
  data: FinalizeData,
): Promise<RunnerResult> {
  const run = await db.automationRun.update({
    where: { id: runId },
    data: {
      status: data.status,
      errorMessage: data.errorMessage,
      blockedReason: data.blockedReason,
      funnelStats: data.funnelStats,
      jobsSearched: data.jobsSearched,
      jobsDeduplicated: data.jobsDeduplicated,
      jobsProcessed: data.jobsProcessed,
      jobsMatched: data.jobsMatched,
      jobsSaved: data.jobsSaved,
      completedAt: new Date(),
    },
  });

  // Read the slot once rather than inline, so the hour and the minute come
  // from the same row — reading them separately could straddle an edit.
  const slot = await db.automation.findUnique({
    where: { id: run.automationId },
    select: { scheduleHour: true, scheduleMinute: true },
  });

  await db.automation.update({
    where: { id: run.automationId },
    data: {
      lastRunAt: new Date(),
      // `?? 8` rather than `|| 8`: hour 0 is a legitimate slot that `||` would
      // quietly rewrite to 08:00.
      nextRunAt: calculateNextRunAt(
        slot?.scheduleHour ?? 8,
        slot?.scheduleMinute ?? 0,
      ),
    },
  });

  return {
    runId: run.id,
    ...data,
  };
}

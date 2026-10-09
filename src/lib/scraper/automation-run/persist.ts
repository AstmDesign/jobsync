import db from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import type { Automation, ScrapedJobData } from "@/models/automation.model";
import type { JobDetails } from "../types";
import { mapScrapedJobToJobRecord } from "../mapper";
import { normalizeJobUrl } from "../utils";
import type { SkillTerm } from "./skillTags";

// Raw lexical score is ~0..PRERANK_MAX; scale into 0..99 so it fits the Int
// matchScore column and stays below a perfect LLM score (100). Internal sort
// only — never shown as a percentage.
const PRERANK_MAX =
  APP_CONSTANTS.ATS_TITLE_WEIGHT +
  APP_CONSTANTS.ATS_SKILL_WEIGHT +
  0.01;

export function scalePrerank(raw: number): number {
  return Math.min(99, Math.max(0, Math.round((raw / PRERANK_MAX) * 99)));
}

// Returns saved: false (instead of throwing) when the job is already recorded
// for this user — either a concurrent run saved the exact same URL first (the
// Job_userId_jobUrl_automation_key partial unique index, migrations/
// 20260710000002_job_automation_url_unique, is the backstop for that race) or
// the same title+company is already on file under a different URL (see the
// title+company check below). App-level dedup only sees a point-in-time
// snapshot, so both checks matter.
export async function persistDiscoveredJob(
  automation: Automation,
  job: JobDetails,
  matchScore: number,
  matchData: object,
  skillTerms: SkillTerm[],
): Promise<{ saved: boolean; tagsApplied: number }> {
  const scrapedJob: ScrapedJobData = {
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    sourceUrl: normalizeJobUrl(job.url),
    sourceBoard: automation.jobBoard,
    employmentType: job.employmentType,
    isRemote: job.isRemote,
    workplaceType: job.workplaceType,
  };

  const jobRecord = await mapScrapedJobToJobRecord({
    scrapedJob,
    userId: automation.userId,
    automationId: automation.id,
    matchScore,
    matchData: JSON.stringify(matchData),
    skillTerms,
  });

  // Race-condition backstop for the point-in-time dedup check the caller
  // already ran against getExistingJobDedupeMap. Checks title+company alone
  // (not also requiring a jobUrl match) because the query-mode scrapers can
  // hand back a different URL for the same posting run to run (session/
  // tracking tokens in the link) — so this must catch that case too, not
  // just the exact-URL race it originally guarded.
  const existing = await db.job.findFirst({
    where: {
      userId: automation.userId,
      jobTitleId: jobRecord.jobTitleId,
      companyId: jobRecord.companyId,
    },
    select: { id: true },
  });
  if (existing) return { saved: false, tagsApplied: 0 };

  try {
    await db.job.create({ data: jobRecord });
    return { saved: true, tagsApplied: jobRecord.tags?.connect.length ?? 0 };
  } catch (err: any) {
    if (err?.code === "P2002") return { saved: false, tagsApplied: 0 };
    throw err;
  }
}

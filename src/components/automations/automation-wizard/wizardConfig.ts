import { APP_CONSTANTS } from "@/lib/constants";
import { hasMinResumeSections } from "@/lib/resumeSections";
import type { CreateAutomationInput } from "@/models/automation.schema";
import type { AtsConfigValue } from "../AtsSearchStep";

// Was a fixed 6-value union; widened to a plain string since a custom
// catalog board's slug (any value — see jobBoard.actions.ts slugify()) can
// also be the active jobBoard now.
export type AtsKey = string;

export const EMPTY_ATS: AtsConfigValue = {
  companies: [],
  targetTitles: [],
  keywords: [],
  locations: [],
  strictLocation: false,
  topK: APP_CONSTANTS.MAX_JOBS_PER_RUN,
  saveUnanalyzed: true,
};

export const STEPS = [
  { id: "basics", title: "Basics", description: "Name your automation" },
  { id: "search", title: "Search", description: "Configure search criteria" },
  { id: "resume", title: "Resume", description: "Select resume for matching" },
  { id: "matching", title: "Matching", description: "Set match threshold" },
  { id: "schedule", title: "Schedule", description: "When to run" },
  { id: "review", title: "Review", description: "Confirm settings" },
];

export const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

export function parseEditSourceConfig(
  sc?: string | null,
): CreateAutomationInput["sourceConfig"] | undefined {
  if (!sc) return undefined;
  try {
    const parsed = JSON.parse(sc);
    // sourceConfig is always keyed by exactly one jobBoard slug — which may
    // now be a custom catalog slug, not just one of the six built-ins — so
    // "has at least one key" is the real test, not an allowlist of names.
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    return Object.keys(parsed).length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export interface WizardResume {
  id: string;
  title: string;
  // Number of ResumeSections rows. The wizard lists every resume the user
  // owns, but matching reads sections only (see convertResumeForMatch), so a
  // resume below the threshold is shown disabled rather than hidden.
  sectionCount: number;
}

// Shape returned by getResumeList (resumeListSelect). Only the bits the
// wizard cares about.
interface ResumeListRow {
  id: string;
  title: string;
  _count?: { ResumeSections?: number | null } | null;
}

export function toWizardResumes(rows: unknown): WizardResume[] {
  if (!Array.isArray(rows)) return [];
  return (rows as ResumeListRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    sectionCount: r._count?.ResumeSections ?? 0,
  }));
}

// Matching builds its prompt from ResumeSections only, so a resume below the
// threshold would score every job against an effectively empty CV.
export const isResumeSelectable = (resume: WizardResume): boolean =>
  hasMinResumeSections(resume.sectionCount);

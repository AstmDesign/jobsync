import { APP_CONSTANTS } from "@/lib/constants";
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
}

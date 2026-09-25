import type { LeverCompany } from "@/models/automation.model";

// The step is provider-agnostic; it edits a superset shape that covers both
// company-board configs (Greenhouse/Lever/Ashby — `companies` populated,
// `keywords` an optional ranking filter) and query-board configs (Indeed/
// Glassdoor/LinkedIn — no `companies`, `keywords` is the required search
// query instead). Every field is optional here so one value type works for
// both; each sub-component treats absence as "empty" via `?? []`/`?? false`.
export type AtsConfigValue = {
  companies?: LeverCompany[];
  targetTitles?: string[];
  keywords?: string[];
  locations?: string[];
  strictLocation?: boolean;
  topK?: number;
  saveUnanalyzed?: boolean;
};

export type EntityOption = { id: string; label: string; value: string };

export const PROVIDER_META: Record<
  string,
  { label: string; urlHint: string; searchExample: string }
> = {
  greenhouse: {
    label: "Greenhouse",
    urlHint: "Or paste a boards.greenhouse.io link",
    searchExample: "Anthropic",
  },
  lever: {
    label: "Lever",
    urlHint: "Or paste a jobs.lever.co link or token",
    searchExample: "Netflix",
  },
  ashby: {
    label: "Ashby",
    urlHint: "Or paste a jobs.ashbyhq.com link or token",
    searchExample: "Ramp",
  },
};

// Automation types and interfaces

export type AutomationStatus = "active" | "paused";
export type AutomationRunStatus =
  | "running"
  | "cancelling"
  | "completed"
  | "failed"
  | "completed_with_errors"
  | "blocked"
  | "rate_limited"
  | "cancelled";
export type DiscoveryStatus = "new" | "accepted" | "dismissed";
// "Company board" providers (greenhouse/lever/ashby) are watched by
// name+token against a per-company ATS API. "Query" providers (indeed/
// glassdoor/linkedin) have no per-company API — they're searched directly by
// keywords+location via a headless-browser scraper instead. See
// src/lib/scraper/ats/types.ts (AtsProvider.mode) for how the run pipeline
// branches between the two.
export type JobBoard =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "indeed"
  | "glassdoor"
  | "linkedin";

export interface GreenhouseCompany {
  name: string;
  token: string;
}

export interface GreenhouseSourceConfig {
  companies: GreenhouseCompany[];
  targetTitles?: string[];
  keywords?: string[];
  locations?: string[];
  strictLocation?: boolean;
  topK?: number;
  saveUnanalyzed?: boolean;
}

export type LeverHost = "default" | "eu";

export interface LeverCompany {
  name: string;
  token: string;
  host?: LeverHost; // absent/"default" = the common case
}

// Field-identical to Greenhouse except `companies` carries the extra `host`.
export interface LeverSourceConfig
  extends Omit<GreenhouseSourceConfig, "companies"> {
  companies: LeverCompany[];
}

// Ashby has a single global host, so its company entries are the plain
// {name, token} shape — no `host`, unlike Lever.
export interface AshbyCompany {
  name: string;
  token: string;
}

export interface AshbySourceConfig
  extends Omit<GreenhouseSourceConfig, "companies"> {
  companies: AshbyCompany[];
}

// Query-based providers have no company/token concept — `keywords` is the
// actual search query (not just a post-fetch ranking filter like it is for
// the company-board providers above).
export interface QueryBoardSourceConfig {
  keywords: string[];
  locations?: string[];
  strictLocation?: boolean;
  topK?: number;
  saveUnanalyzed?: boolean;
}

export interface SourceConfig {
  greenhouse?: GreenhouseSourceConfig;
  lever?: LeverSourceConfig;
  ashby?: AshbySourceConfig;
  indeed?: QueryBoardSourceConfig;
  glassdoor?: QueryBoardSourceConfig;
  linkedin?: QueryBoardSourceConfig;
}

// Plain, dependency-free board list. Do NOT import this from ats/registry.ts
// (that pulls the network-calling search fns into client bundles). Both the
// client-imported schema and the scheduler import it here.
export const ATS_BOARDS: JobBoard[] = [
  "greenhouse",
  "lever",
  "ashby",
  "indeed",
  "glassdoor",
  "linkedin",
];

// Query-based boards (no company/token concept — see QueryBoardSourceConfig).
export const QUERY_BOARDS: JobBoard[] = ["indeed", "glassdoor", "linkedin"];
export function isQueryBoard(board: string): boolean {
  return QUERY_BOARDS.includes(board as JobBoard);
}

// Boards that used to exist and were removed. Their Automation rows stay in
// the database; the UI marks them retired and only offers pause/delete.
export const RETIRED_BOARDS = ["jsearch"];
export function isRetiredBoard(board: string): boolean {
  return RETIRED_BOARDS.includes(board);
}

// A row from the JobBoard catalog table (src/actions/jobBoard.actions.ts).
// `isSupported` mirrors whether `slug` has a matching provider in
// src/lib/scraper/ats/registry.ts — only supported boards can actually run
// an automation today; the rest are catalog/roadmap entries.
export interface JobBoardCatalogEntry {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  websiteUrl: string | null;
  providerKey: string | null;
  isSupported: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface Automation {
  id: string;
  userId: string;
  name: string;
  jobBoard: JobBoard;
  keywords: string;
  location: string;
  sourceConfig?: string | null;
  resumeId: string;
  matchThreshold: number;
  scheduleHour: number;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  status: AutomationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationWithResume extends Automation {
  resume: {
    id: string;
    title: string;
  };
}

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  jobsSearched: number;
  jobsDeduplicated: number;
  jobsProcessed: number;
  jobsMatched: number;
  jobsSaved: number;
  status: AutomationRunStatus;
  errorMessage: string | null;
  blockedReason: string | null;
  funnelStats: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface DiscoveredJob {
  id: string;
  userId: string;
  automationId: string;
  automation?: {
    id: string;
    name: string;
  };
  jobUrl: string | null;
  description: string;
  jobType: string;
  workplaceType?: string | null;
  createdAt: Date;
  jobTitleId: string;
  companyId: string;
  locationId: string | null;
  matchScore: number;
  matchData: string | null;
  discoveryStatus: DiscoveryStatus;
  discoveredAt: Date;
  JobTitle: { label: string };
  Company: { label: string };
  Location?: { label: string } | null;
}

export interface ScrapedJobData {
  title: string;
  company: string;
  location: string;
  description: string;
  sourceUrl: string;
  sourceBoard: JobBoard;
  employmentType?: string;
  isRemote?: boolean;
  workplaceType?: string;
}

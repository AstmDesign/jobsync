import type { JobBoard } from "@/models/automation.model";
import type { JobDetails } from "../types";
import type { QuerySearchParams, QuerySearchResult } from "../queryBoard";

// `host` is optional and Lever-only (Greenhouse ignores it); it's persisted
// once a company is resolved so runtime fetches never re-probe regions.
export type AtsHost = "default" | "eu";

// Company-mode providers (Greenhouse/Lever/Ashby): watch a list of
// {name, token} companies against each site's free public per-company JSON
// API. Errors are attributed per-token so the caller can report which
// company failed.
export interface CompanyBoardAtsProvider {
  mode: "companies";
  id: JobBoard;
  label: string; // display name shown in the wizard/detail UI
  // Fetch a watchlist with bounded concurrency + per-token isolation.
  search(
    companies: { name: string; token: string; host?: AtsHost }[],
  ): Promise<{
    jobs: JobDetails[];
    errors: { token: string; reason: string }[];
  }>;
}

// Query-mode providers (Indeed/Glassdoor/LinkedIn): no per-company API, so
// jobs are found by keyword+location search against the site's own
// search-results page (headless-browser scraping — see ../queryBoard.ts).
// Errors have no token to attribute to, only a reason.
export interface QueryBoardAtsProvider {
  mode: "query";
  id: JobBoard;
  label: string;
  search(params: QuerySearchParams): Promise<QuerySearchResult>;
}

export type AtsProvider = CompanyBoardAtsProvider | QueryBoardAtsProvider;

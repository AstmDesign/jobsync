import type { JobDetails } from "./types";

// Shared contract for the "query" job boards — Indeed, Glassdoor, LinkedIn
// (src/lib/scraper/indeed, /glassdoor, /linkedin). Unlike the company-board
// providers (Greenhouse/Lever/Ashby), these have no per-company API: each is
// searched directly by keyword + location against the site's own
// search-results page via a headless browser (see browser.ts).
//
// To add another site in this family: create src/lib/scraper/<site>/index.ts
// with a class extending QueryJobBoardScraper, implement `runSearch` for one
// keyword+location pair, then register it in ats/registry.ts with
// `mode: "query"`.
export interface QuerySearchParams {
  keywords: string[];
  locations: string[];
  topK: number;
}

export interface QuerySearchError {
  reason: string;
}

export interface QuerySearchResult {
  jobs: JobDetails[];
  errors: QuerySearchError[];
}

export abstract class QueryJobBoardScraper {
  abstract readonly id: string;
  abstract readonly label: string;

  // One keyword+location search. Implementations should return `success:
  // false` (never throw) for a single search's failure so the caller can
  // keep going with the remaining keyword/location combinations.
  protected abstract runSearch(
    keyword: string,
    location: string | undefined,
  ): Promise<{ jobs: JobDetails[] } | { error: string }>;

  // Runs every keyword against every location (capped — see
  // APP_CONSTANTS.QUERY_SCRAPER_MAX_LOCATIONS), merging results and
  // collecting per-search errors without letting one bad combination abort
  // the rest. Sequential, not parallel: these are real browser page loads
  // against sites that actively rate-limit/block automated traffic, and this
  // app deliberately doesn't use proxy rotation (see browser.ts) — running
  // them one at a time is the least likely to get the automation's egress IP
  // flagged.
  async search(params: QuerySearchParams): Promise<QuerySearchResult> {
    const jobs: JobDetails[] = [];
    const errors: QuerySearchError[] = [];

    const locations = params.locations.length > 0 ? params.locations : [undefined];

    for (const keyword of params.keywords) {
      for (const location of locations) {
        const result = await this.runSearch(keyword, location);
        if ("error" in result) {
          errors.push({
            reason: `"${keyword}"${location ? ` in "${location}"` : ""}: ${result.error}`,
          });
        } else {
          jobs.push(...result.jobs);
        }
      }
    }

    return { jobs, errors };
  }
}

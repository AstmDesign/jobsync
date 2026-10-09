import type { JobBoard } from "@/models/automation.model";
import { searchGreenhouseJobs } from "../greenhouse";
import { searchLeverJobs } from "../lever";
import { searchAshbyJobs } from "../ashby";
import { searchIndeedJobs } from "../indeed";
import { searchGlassdoorJobs } from "../glassdoor";
import { searchLinkedInJobs } from "../linkedin";
import { createCustomSiteProvider } from "../custom";
import type { AtsProvider } from "./types";
import db from "@/lib/db";

// Server-only: imports the real network-calling search fns (fetch, p-limit,
// playwright-core). Never import this from client-bundled code — use
// ATS_BOARDS from automation.model.ts for the plain, dependency-free board
// list.
export const ATS_PROVIDERS: Partial<Record<JobBoard, AtsProvider>> = {
  greenhouse: {
    mode: "companies",
    id: "greenhouse",
    label: "Greenhouse",
    search: searchGreenhouseJobs,
  },
  lever: { mode: "companies", id: "lever", label: "Lever", search: searchLeverJobs },
  ashby: { mode: "companies", id: "ashby", label: "Ashby", search: searchAshbyJobs },
  indeed: { mode: "query", id: "indeed", label: "Indeed", search: searchIndeedJobs },
  glassdoor: {
    mode: "query",
    id: "glassdoor",
    label: "Glassdoor",
    search: searchGlassdoorJobs,
  },
  linkedin: {
    mode: "query",
    id: "linkedin",
    label: "LinkedIn",
    search: searchLinkedInJobs,
  },
};

// Resolves a provider for ANY board, not just the six built-in ones above:
// falls back to the Job Boards catalog (DB table) for a custom board with a
// websiteUrl that's been activated (see src/actions/jobBoard.actions.ts —
// a board's isSupported flips to true once it has a websiteUrl), wrapping
// it in the generic custom-site scraper. Returns undefined for anything
// else (unknown slug, deactivated, or no websiteUrl) so the caller's
// existing "board not available" handling covers this case too.
export async function resolveAtsProvider(
  jobBoard: JobBoard,
): Promise<AtsProvider | undefined> {
  const known = ATS_PROVIDERS[jobBoard];
  if (known) return known;

  const board = await db.jobBoard.findUnique({ where: { slug: jobBoard } });
  if (!board || !board.isActive || !board.isSupported || !board.websiteUrl) {
    return undefined;
  }
  return createCustomSiteProvider(board.slug, board.label, board.websiteUrl);
}

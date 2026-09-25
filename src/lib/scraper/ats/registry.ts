import type { JobBoard } from "@/models/automation.model";
import { searchGreenhouseJobs } from "../greenhouse";
import { searchLeverJobs } from "../lever";
import { searchAshbyJobs } from "../ashby";
import { searchIndeedJobs } from "../indeed";
import { searchGlassdoorJobs } from "../glassdoor";
import { searchLinkedInJobs } from "../linkedin";
import type { AtsProvider } from "./types";

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

import { z } from "zod";
import { APP_CONSTANTS } from "@/lib/constants";
// Deep-import (NOT the barrel) — utils.ts is pure; the barrel pulls scraper
// network code into the client bundle via this file's client consumers.
import { ATS_TOKEN_REGEX } from "@/lib/scraper/utils";
import { QUERY_BOARDS } from "./automation.model";

export const JobBoardSchema = z.enum([
  "greenhouse",
  "lever",
  "ashby",
  "indeed",
  "glassdoor",
  "linkedin",
]);

export const AutomationStatusSchema = z.enum(["active", "paused"]);

export const AutomationRunStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "completed_with_errors",
  "blocked",
  "rate_limited",
]);

export const DiscoveryStatusSchema = z.enum(["new", "accepted", "dismissed"]);

export const GreenhouseCompanySchema = z.object({
  name: z.string().min(1).max(200),
  token: z.string().min(1).max(80),
});

export const GreenhouseSourceConfigSchema = z.object({
  companies: z
    .array(GreenhouseCompanySchema)
    .max(APP_CONSTANTS.ATS_MAX_COMPANIES),
  targetTitles: z.array(z.string().min(1).max(100)).optional(),
  keywords: z.array(z.string().min(1).max(100)).optional(),
  locations: z.array(z.string().min(1).max(100)).optional(),
  strictLocation: z.boolean().optional(),
  topK: z.number().int().min(1).max(APP_CONSTANTS.ATS_LISTING_CAP).optional(),
  saveUnanalyzed: z.boolean().optional(),
});

// Override `token` with the allowlist regex so a directly-POSTed Lever config
// can't smuggle a malformed token past the save boundary.
export const LeverCompanySchema = GreenhouseCompanySchema.extend({
  token: z.string().regex(ATS_TOKEN_REGEX),
  host: z.enum(["default", "eu"]).optional(),
});

// Same fields/MAX/cap as Greenhouse, `companies` swapped to LeverCompanySchema.
export const LeverSourceConfigSchema = GreenhouseSourceConfigSchema.extend({
  companies: z
    .array(LeverCompanySchema)
    .max(APP_CONSTANTS.ATS_MAX_COMPANIES),
});

// Same token allowlist as Lever (rejects path/query injection at the save
// boundary); no `host` — Ashby is single-host.
export const AshbyCompanySchema = GreenhouseCompanySchema.extend({
  token: z.string().regex(ATS_TOKEN_REGEX),
});

export const AshbySourceConfigSchema = GreenhouseSourceConfigSchema.extend({
  companies: z
    .array(AshbyCompanySchema)
    .max(APP_CONSTANTS.ATS_MAX_COMPANIES),
});

// Query-based boards search directly by keyword — no company/token concept.
export const QueryBoardSourceConfigSchema = z.object({
  keywords: z.array(z.string().min(1).max(100)).min(1),
  locations: z.array(z.string().min(1).max(100)).optional(),
  strictLocation: z.boolean().optional(),
  topK: z.number().int().min(1).max(APP_CONSTANTS.ATS_LISTING_CAP).optional(),
  saveUnanalyzed: z.boolean().optional(),
});

export const SourceConfigSchema = z.object({
  greenhouse: GreenhouseSourceConfigSchema.optional(),
  lever: LeverSourceConfigSchema.optional(),
  ashby: AshbySourceConfigSchema.optional(),
  indeed: QueryBoardSourceConfigSchema.optional(),
  glassdoor: QueryBoardSourceConfigSchema.optional(),
  linkedin: QueryBoardSourceConfigSchema.optional(),
});

// Shared by create/update: company boards need >=1 company; query boards
// need >=1 keyword (that's the actual search term, not just a filter).
function validateSourceConfig(
  data: { jobBoard?: string; sourceConfig?: z.infer<typeof SourceConfigSchema> },
  ctx: z.RefinementCtx,
) {
  if (!data.jobBoard) return;
  const isQueryBoard = (QUERY_BOARDS as string[]).includes(data.jobBoard);
  const config = data.sourceConfig?.[data.jobBoard as keyof typeof data.sourceConfig];

  if (isQueryBoard) {
    const keywords = (config as { keywords?: string[] } | undefined)?.keywords ?? [];
    if (keywords.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceConfig", data.jobBoard, "keywords"],
        message: "Add at least one search keyword",
      });
    }
  } else {
    const companies = (config as { companies?: unknown[] } | undefined)?.companies ?? [];
    if (companies.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceConfig", data.jobBoard, "companies"],
        message: "Select at least one company",
      });
    }
  }
}

export const CreateAutomationSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    jobBoard: JobBoardSchema,
    keywords: z.string().max(200).optional(),
    location: z.string().max(100).optional(),
    sourceConfig: SourceConfigSchema.optional(),
    resumeId: z.string().uuid("Invalid resume"),
    matchThreshold: z.number().min(0).max(100),
    scheduleHour: z.number().min(0).max(23),
  })
  .superRefine(validateSourceConfig);

export const UpdateAutomationSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    jobBoard: JobBoardSchema.optional(),
    keywords: z.string().max(200).optional(),
    location: z.string().max(100).optional(),
    sourceConfig: SourceConfigSchema.optional(),
    resumeId: z.string().uuid("Invalid resume").optional(),
    matchThreshold: z.number().min(0).max(100).optional(),
    scheduleHour: z.number().min(0).max(23).optional(),
  })
  .superRefine(validateSourceConfig);

export type CreateAutomationInput = z.infer<typeof CreateAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof UpdateAutomationSchema>;
export type SourceConfigInput = z.infer<typeof SourceConfigSchema>;
export type GreenhouseSourceConfigInput = z.infer<
  typeof GreenhouseSourceConfigSchema
>;

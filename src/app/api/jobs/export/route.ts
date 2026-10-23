import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Papa from "papaparse";
import { PassThrough } from "node:stream";
import { getJobsIterator } from "@/actions/job.actions";
import type { JobsListFilters } from "@/actions/job/queries";
import { format } from "date-fns";
import { auth } from "@/auth";
import { getWorkplaceTypeLabel } from "@/models/job.model";
import { log } from "@/lib/telemetry";

const FIELDS: string[] = [
  "index",
  "createdAt",
  "applied",
  "appliedDate",
  "Company",
  "JobTitle",
  "jobType",
  "workplaceType",
  "Location",
  "JobSource",
  "Status",
  "salaryRange",
  "matchScore",
  "matchedCV",
  "jobUrl",
];

const extractLabel = (field: { label?: string } | undefined): string => {
  return field?.label || "N/A";
};

const mapJobType = (type: string | undefined): string => {
  switch (type) {
    case "FT":
      return "Full Time";
    case "PT":
      return "Part Time";
    case "C":
      return "Contract";
    default:
      return "Unknown";
  }
};

const transformJobData = (
  job: Record<string, any>,
  index: number
): Record<string, any> => {
  return {
    index: index + 1,
    createdAt: job.createdAt
      ? format(new Date(job.createdAt), "yyyy-MM-dd")
      : "N/A",
    applied: job.applied ? "Yes" : "No",
    appliedDate: job.appliedDate
      ? format(new Date(job.appliedDate), "yyyy-MM-dd")
      : "N/A",
    Company: extractLabel(job.Company),
    JobTitle: extractLabel(job.JobTitle),
    jobType: mapJobType(job.jobType),
    workplaceType: getWorkplaceTypeLabel(job.workplaceType),
    Location: extractLabel(job.Location),
    JobSource: extractLabel(job.JobSource),
    Status: extractLabel(job.Status),
    salaryRange: job.salaryRange || "N/A",
    // hideUnanalyzedScore has already nulled a keyword-only pre-rank, so an
    // empty cell here means "not analyzed" rather than "scored zero".
    matchScore: typeof job.matchScore === "number" ? job.matchScore : "",
    matchedCV: job.MatchResume?.title ?? "",
    jobUrl: job.jobUrl || "",
  };
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

// The body is client-supplied, so each key is read individually rather than
// spread into the where clause — an arbitrary object reaching Prisma would let
// the caller filter on anything, including other users' rows.
const parseFilters = (body: unknown): JobsListFilters => {
  const raw = (body ?? {}) as Record<string, unknown>;
  return {
    filter: asString(raw.filter),
    search: asString(raw.search),
    companyValue: asString(raw.companyValue),
    titleValue: asString(raw.titleValue),
    locationValue: asString(raw.locationValue),
    sourceValue: asString(raw.sourceValue),
    matchResumeId: asString(raw.matchResumeId),
    appliedOnly: raw.appliedOnly === true,
  };
};

export const POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Older callers posted no body at all, and an empty body must still mean
  // "export everything" rather than a 500.
  let filters: JobsListFilters = {};
  try {
    filters = parseFilters(await req.json());
  } catch {
    filters = {};
  }

  const passThrough = new PassThrough();
  let isFirstChunk = true;
  let hasError = false;

  (async () => {
    try {
      let recordIndex = 0;
      for await (const chunk of getJobsIterator(filters)) {
        if (hasError) break;
        const transformedData = chunk.map((job, idx) =>
          transformJobData(job, recordIndex + idx)
        );
        recordIndex += chunk.length;
        const csv = Papa.unparse(
          { fields: FIELDS, data: transformedData },
          {
            header: isFirstChunk,
          }
        );
        passThrough.write((isFirstChunk ? "" : "\n") + csv);
        isFirstChunk = false;
      }
    } catch (error) {
      hasError = true;
      log.error("Error streaming jobs CSV", { error: String(error) });
      // The response headers are already on the wire by this point, so the
      // stream can only be ended — there's no status left to change.
    } finally {
      passThrough.end();
    }
  })();

  return new NextResponse(passThrough as any, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="jobs.csv"',
    },
  });
};

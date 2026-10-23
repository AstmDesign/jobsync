"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { JOB_TYPES } from "@/models/job.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { requireUser } from "../shared";
import { hideUnanalyzedScore } from "./shared";

const JOB_LIST_SELECT = {
  id: true,
  createdAt: true,
  discoveredAt: true,
  JobSource: true,
  JobTitle: true,
  jobType: true,
  workplaceType: true,
  Company: true,
  Status: true,
  Location: true,
  dueDate: true,
  appliedDate: true,
  description: false,
  Resume: true,
  // The CV the match score was produced against — surfaced as the "Matched CV"
  // column. Separate from Resume above, which is the manually attached one.
  MatchResume: { select: { id: true, title: true } },
  CoverLetter: true,
  matchScore: true,
  matchData: true,
  discoveryStatus: true,
  _count: { select: { Notes: true } },
};

const JOB_EXPORT_SELECT = {
  id: true,
  createdAt: true,
  JobSource: true,
  JobTitle: true,
  jobType: true,
  workplaceType: true,
  Company: true,
  Status: true,
  Location: true,
  dueDate: true,
  applied: true,
  appliedDate: true,
  jobUrl: true,
  salaryRange: true,
  // matchData is selected only so hideUnanalyzedScore can decide whether the
  // score is a real AI match; it's stripped before the row leaves the iterator.
  matchScore: true,
  matchData: true,
  MatchResume: { select: { id: true, title: true } },
};

const JOB_DETAILS_INCLUDE = {
  JobSource: true,
  JobTitle: true,
  Company: true,
  Status: true,
  Location: true,
  Resume: {
    include: {
      File: true,
    },
  },
  CoverLetter: true,
  tags: true,
  contactLinks: {
    include: {
      Role: true,
      Contact: {
        select: {
          id: true,
          name: true,
          title: true,
          email: true,
          phone: true,
          linkedinUrl: true,
          Company: { select: { id: true, label: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export type JobsListFilters = {
  filter?: string;
  search?: string;
  companyValue?: string;
  appliedOnly?: boolean;
  titleValue?: string;
  locationValue?: string;
  sourceValue?: string;
  // Resume id (not a slug/value) — the filter dropdown is populated from
  // getMatchResumesInUse, which returns ids.
  matchResumeId?: string;
};

const buildJobsWhereClause = (userId: string, filters: JobsListFilters) => {
  const {
    filter,
    search,
    companyValue,
    appliedOnly,
    titleValue,
    locationValue,
    sourceValue,
    matchResumeId,
  } = filters;

  const filterBy = filter
    ? filter === Object.keys(JOB_TYPES)[1]
      ? {
          jobType: filter,
        }
      : filter === "accepted" || filter === "dismissed"
        ? {
            discoveryStatus: filter,
          }
        : {
            Status: {
              value: filter,
            },
          }
    : {};

  const whereClause: any = {
    userId,
    ...filterBy,
  };

  // Dismissed discovered jobs are kept only for dedup and shouldn't
  // clutter the tracked jobs list unless explicitly filtered for.
  if (filter !== "dismissed") {
    whereClause.AND = [
      {
        OR: [{ discoveryStatus: null }, { discoveryStatus: { not: "dismissed" } }],
      },
    ];
  }

  if (companyValue) {
    whereClause.Company = { value: companyValue };
  }

  if (titleValue) {
    whereClause.JobTitle = { value: titleValue };
  }

  if (locationValue) {
    whereClause.Location = { value: locationValue };
  }

  if (sourceValue) {
    whereClause.JobSource = { value: sourceValue };
  }

  if (matchResumeId) {
    whereClause.matchResumeId = matchResumeId;
  }

  if (appliedOnly) {
    whereClause.applied = true;
  }

  // An explicit facet filter already pins that field, so searching it too
  // would widen the result set back out via OR.
  if (search) {
    const searchConditions: Record<string, any>[] = [];
    if (!titleValue) {
      searchConditions.push({ JobTitle: { label: { contains: search } } });
    }
    if (!companyValue) {
      searchConditions.push({ Company: { label: { contains: search } } });
    }
    if (!locationValue) {
      searchConditions.push({ Location: { label: { contains: search } } });
    }
    if (!sourceValue) {
      searchConditions.push({ JobSource: { label: { contains: search } } });
    }
    searchConditions.push(
      { description: { contains: search } },
    );
    whereClause.OR = searchConditions;
  }

  return whereClause;
};

export const getJobsList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  filter?: string,
  search?: string,
  companyValue?: string,
  appliedOnly?: boolean,
  titleValue?: string,
  locationValue?: string,
  sourceValue?: string,
  matchResumeId?: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const skip = (page - 1) * limit;

    const whereClause = buildJobsWhereClause(user.id, {
      filter,
      search,
      companyValue,
      appliedOnly,
      titleValue,
      locationValue,
      sourceValue,
      matchResumeId,
    });

    const [data, total] = await Promise.all([
      prisma.job.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: JOB_LIST_SELECT,
        orderBy: {
          createdAt: "desc",
          // appliedDate: "desc",
        },
      }),
      prisma.job.count({
        where: whereClause,
      }),
    ]);
    return { success: true, data: data.map(hideUnanalyzedScore), total };
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    return handleError(error, msg);
  }
};

// Streams every job matching the same where clause the jobs list builds, so
// "export" always means "export exactly what I'm looking at". Previously this
// built its own filter object against fields that don't exist on Job
// (`status`/`type`), which would have thrown had a filter ever been passed.
//
// Paginates by cursor rather than skip/take: an export of thousands of rows is
// slow enough that a concurrent insert or delete would shift a numeric offset
// and silently duplicate or drop a row mid-stream.
export async function* getJobsIterator(
  filters: JobsListFilters = {},
  pageSize = 200,
) {
  const user = await requireUser();
  const whereClause = buildJobsWhereClause(user.id, filters);
  let cursor: string | undefined;

  while (true) {
    const chunk = await prisma.job.findMany({
      where: whereClause,
      select: JOB_EXPORT_SELECT,
      take: pageSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      // id is the cursor, so it has to be part of the ordering for the window
      // to be stable when several jobs share a createdAt.
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });

    if (!chunk.length) {
      break;
    }

    yield chunk.map(hideUnanalyzedScore);
    if (chunk.length < pageSize) {
      break;
    }
    cursor = chunk[chunk.length - 1].id;
  }
}

export const getJobDetails = async (
  jobId: string,
): Promise<any | undefined> => {
  try {
    if (!jobId) {
      throw new Error("Please provide job id");
    }
    const user = await requireUser();

    const job = await prisma.job.findUnique({
      where: {
        id: jobId,
        userId: user.id,
      },
      include: JOB_DETAILS_INCLUDE,
    });
    return { job, success: true };
  } catch (error) {
    const msg = "Failed to fetch job details. ";
    return handleError(error, msg);
  }
};

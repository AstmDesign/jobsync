"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";
import { requireUser } from "../shared";

// JobStatus is global reference data with no createdBy column, so unlike every
// other list here it is not scoped to the current user.
export const getStatusList = async (): Promise<any | undefined> => {
  try {
    const statuses = await prisma.jobStatus.findMany();
    return statuses;
  } catch (error) {
    const msg = "Failed to fetch status list. ";
    return handleError(error, msg);
  }
};

export const getJobSourceList = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const list = await prisma.jobSource.findMany({
      where: {
        createdBy: user.id,
      },
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch job source list. ";
    return handleError(error, msg);
  }
};

// Same scope as getJobSourceList, but filtered to sources actually linked to
// at least one of the user's jobs — for the My Jobs filter dropdown, where
// listing every source ever created (some never used on a job) would be
// misleading.
export const getJobSourcesInUse = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const list = await prisma.jobSource.findMany({
      where: {
        createdBy: user.id,
        jobsApplied: { some: {} },
      },
      orderBy: { label: "asc" },
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch job source list. ";
    return handleError(error, msg);
  }
};

// Resumes that are actually recorded as the match CV on at least one of the
// user's jobs — populates the "Matched CV" filter dropdown. Same rationale as
// getJobSourcesInUse: offering every resume would list options that filter to
// nothing. Returns { id, title } because the filter keys off the resume id, not
// a canonical value (Resume has no value column).
export const getMatchResumesInUse = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const list = await prisma.resume.findMany({
      where: {
        profile: { userId: user.id },
        matchedJobs: { some: { userId: user.id } },
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch matched resume list. ";
    return handleError(error, msg);
  }
};

// Automations that have actually discovered at least one of the user's jobs —
// populates the "Automation" filter dropdown. Same rationale as
// getJobSourcesInUse: an automation that has never produced a job would filter
// to nothing. The resume title comes along so the dropdown can group by CV,
// which is how the automations page presents them and the only way to tell two
// similarly-named automations on different CVs apart.
//
// Ordered by resume then automation name, so the grouping needs no second sort
// on the client.
export const getAutomationsInUse = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const list = await prisma.automation.findMany({
      where: {
        userId: user.id,
        discoveredJobs: { some: { userId: user.id } },
      },
      select: {
        id: true,
        name: true,
        resume: { select: { id: true, title: true } },
      },
      orderBy: [{ resume: { title: "asc" } }, { name: "asc" }],
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch automation list. ";
    return handleError(error, msg);
  }
};

// Years offered by the Created date filter. Derived from the oldest job rather
// than a DISTINCT over a date expression: Prisma stores SQLite DateTime as a
// millisecond integer, so `strftime('%Y', createdAt)` needs a raw cast and
// breaks quietly if that storage ever changes. The gap between the oldest job
// and today is a handful of years, so filling it in is cheaper than the scan.
//
// Years are computed in UTC here and the browser builds its boundaries in local
// time, which can differ by one around New Year — harmless, since a year with
// no jobs simply returns an empty list.
export const getJobYearsInUse = async (): Promise<number[]> => {
  try {
    const user = await requireUser();
    const oldest = await prisma.job.findFirst({
      where: { userId: user.id },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    if (!oldest) return [];

    const first = oldest.createdAt.getFullYear();
    const current = new Date().getFullYear();
    const years: number[] = [];
    // Newest first, to match the list's default ordering.
    for (let year = Math.max(first, current); year >= Math.min(first, current); year--) {
      years.push(year);
    }
    return years;
  } catch {
    // A broken year list shouldn't take the whole page down — the filter just
    // renders empty.
    return [];
  }
};

export const createLocation = async (
  label: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const value = canonicalizeEntityValue(label.trim());

    if (!value) {
      throw new Error("Please provide location name");
    }

    const existing = await prisma.location.findFirst({
      where: { value, createdBy: user.id },
    });
    if (existing) {
      return { data: existing, success: true };
    }

    const location = await prisma.location.create({
      data: { label, value, createdBy: user.id },
    });

    return { data: location, success: true };
  } catch (error) {
    const msg = "Failed to create job location. ";
    return handleError(error, msg);
  }
};

export const createJobSource = async (
  label: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const value = canonicalizeEntityValue(label.trim());

    if (!value) {
      throw new Error("Please provide job source name");
    }

    const existing = await prisma.jobSource.findFirst({
      where: { value, createdBy: user.id },
    });
    if (existing) {
      return { data: existing, success: true };
    }

    const jobSource = await prisma.jobSource.create({
      data: { label, value, createdBy: user.id },
    });

    return { data: jobSource, success: true };
  } catch (error) {
    const msg = "Failed to create job source. ";
    return handleError(error, msg);
  }
};

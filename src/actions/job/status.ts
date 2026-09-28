"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { JobStatus } from "@/models/job.model";
import { revalidatePath } from "next/cache";
import { requireUser } from "../shared";

export const updateJobStatus = async (
  jobId: string,
  status: JobStatus,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const dataToUpdate = () => {
      switch (status.value) {
        case "applied":
          return {
            statusId: status.id,
            applied: true,
            appliedDate: new Date(),
          };
        case "interview":
          return {
            statusId: status.id,
            applied: true,
          };
        default:
          return {
            statusId: status.id,
          };
      }
    };

    const job = await prisma.job.update({
      where: {
        id: jobId,
        userId: user.id,
      },
      data: dataToUpdate(),
    });
    revalidatePath("/dashboard");
    return { job, success: true };
  } catch (error) {
    const msg = "Failed to update job status.";
    return handleError(error, msg);
  }
};

export const saveJobMatchResult = async (
  jobId: string,
  matchScore: number,
  matchData: string,
  jobTitle?: string,
  company?: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    // Snapshot jobTitle/company at write time (the only moment the Job row is
    // guaranteed to still exist) and persist the result independently of the
    // Job row, so it survives job deletion — see MatchResult in schema.prisma.
    let title = jobTitle;
    let companyLabel = company;
    if (!title) {
      const job = await prisma.job.findUnique({
        where: { id: jobId, userId: user.id },
        include: { JobTitle: true, Company: true },
      });
      title = job?.JobTitle?.label ?? "Untitled job";
      companyLabel = job?.Company?.label;
    }

    await prisma.$transaction([
      prisma.job.update({
        where: { id: jobId, userId: user.id },
        data: { matchScore, matchData },
      }),
      prisma.matchResult.create({
        data: {
          userId: user.id,
          jobId,
          jobTitle: title,
          company: companyLabel,
          matchScore,
          matchData,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    const msg = "Failed to save match result.";
    return handleError(error, msg);
  }
};

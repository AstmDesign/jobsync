"use server";
import MarkdownIt from "markdown-it";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "./shared";
import { APP_CONSTANTS } from "@/lib/constants";
import { buildCoverLetterTitle } from "@/lib/coverLetterTitle";

// html:false escapes raw HTML in the model output before it is ever stored,
// so the saved document is the same shape a hand-written letter produces.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

export const getCoverLetterList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.coverLetter.findMany({
        where: {
          profile: {
            userId: user.id,
          },
        },
        skip,
        take: limit,
        select: {
          id: true,
          profileId: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              Job: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.coverLetter.count({
        where: {
          profile: {
            userId: user.id,
          },
        },
      }),
    ]);
    return { data, total, success: true };
  } catch (error) {
    const msg = "Failed to get cover letter list.";
    return handleError(error, msg);
  }
};

export const createCoverLetter = async (
  title: string,
  content: string
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const value = title.trim().toLowerCase();
    const titleExists = await prisma.coverLetter.findFirst({
      where: {
        title: value,
        profile: {
          userId: user.id,
        },
      },
    });

    if (titleExists) {
      throw new Error("Cover letter title already exists!");
    }

    const profile = await prisma.profile.findFirst({
      where: {
        userId: user.id,
      },
    });

    const res = profile?.id
      ? await prisma.coverLetter.create({
          data: {
            profileId: profile.id,
            title,
            content,
          },
        })
      : await prisma.profile.create({
          data: {
            userId: user.id,
            coverLetters: {
              create: [{ title, content }],
            },
          },
        });

    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to create cover letter.";
    return handleError(error, msg);
  }
};

export const updateCoverLetter = async (
  id: string,
  title: string,
  content: string
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const res = await prisma.coverLetter.update({
      where: { id, profile: { userId: user.id } },
      data: { title, content },
    });

    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to update cover letter.";
    return handleError(error, msg);
  }
};

export const deleteCoverLetterById = async (
  coverLetterId: string
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    await prisma.coverLetter.delete({
      where: { id: coverLetterId, profile: { userId: user.id } },
    });

    return { success: true };
  } catch (error) {
    const msg = "Failed to delete cover letter.";
    return handleError(error, msg);
  }
};

export const deleteCoverLettersByIds = async (
  coverLetterIds: string[]
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const ids = [...new Set(coverLetterIds)].filter(Boolean);
    if (ids.length === 0) throw new Error("At least one cover letter id is required");

    const res = await prisma.coverLetter.deleteMany({
      where: { id: { in: ids }, profile: { userId: user.id } },
    });

    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete cover letters.";
    return handleError(error, msg);
  }
};

// Cover letters that were generated from a job's "Generate Cover Letter"
// action (as opposed to created manually on the Profile page). Distinguished
// by the jobTitle snapshot, which is only ever set by generateCoverLetterForJob.
export const getGeneratedCoverLetterList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const skip = (page - 1) * limit;
    const where = {
      profile: { userId: user.id },
      jobTitle: { not: null },
    };

    const [data, total] = await Promise.all([
      prisma.coverLetter.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          jobTitle: true,
          company: true,
          resumeId: true,
          resumeTitle: true,
          createdAt: true,
          updatedAt: true,
          Job: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.coverLetter.count({ where }),
    ]);
    return { data, total, success: true };
  } catch (error) {
    const msg = "Failed to get generated cover letters list.";
    return handleError(error, msg);
  }
};

export const generateCoverLetterForJob = async (
  jobId: string,
  markdown: string,
  resumeId?: string,
  resumeTitle?: string
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    if (
      !markdown ||
      markdown.trim().length < APP_CONSTANTS.MIN_COVER_LETTER_CHARS
    ) {
      throw new Error("Generated cover letter was too short to save.");
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId, userId: user.id },
      include: { JobTitle: true, Company: true },
    });

    if (!job) {
      throw new Error("Job not found");
    }

    const profile = await prisma.profile.findFirst({
      where: { userId: user.id },
    });

    if (!profile) {
      throw new Error("No profile found for this user.");
    }

    const existing = await prisma.coverLetter.findMany({
      where: { profile: { userId: user.id } },
      select: { title: true },
    });

    const title = buildCoverLetterTitle(
      job.JobTitle?.label ?? "Cover Letter",
      job.Company?.label ?? "",
      existing.map((letter) => letter.title)
    );

    const content = md.render(markdown);

    const created = await prisma.$transaction(async (tx) => {
      const letter = await tx.coverLetter.create({
        data: {
          profileId: profile.id,
          title,
          content,
          jobTitle: job.JobTitle?.label ?? null,
          company: job.Company?.label ?? null,
          resumeId: resumeId ?? null,
          resumeTitle: resumeTitle ?? null,
        },
      });

      await tx.job.update({
        where: { id: jobId, userId: user.id },
        data: { coverLetterId: letter.id },
      });

      return letter;
    });

    return { success: true, data: { id: created.id, title: created.title } };
  } catch (error) {
    const msg = "Failed to save generated cover letter.";
    return handleError(error, msg);
  }
};

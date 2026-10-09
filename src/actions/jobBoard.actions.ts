"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "./shared";
import { ATS_BOARDS } from "@/models/automation.model";

// JobBoard is a global catalog (not per-user) — every signed-in user reads
// the same list, same as it was a hardcoded constant before. Only the
// three ATS_BOARDS slugs have a real scraper wired up in
// src/lib/scraper/ats/registry.ts; everything else is catalog-only until a
// provider module is built for it, so callers must not assume every board
// returned here can actually run an automation.

export const getJobBoardList = async (
  activeOnly: boolean = true,
): Promise<any | undefined> => {
  try {
    await requireUser();
    const list = await prisma.jobBoard.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    return { data: list, success: true };
  } catch (error) {
    const msg = "Failed to fetch job board list. ";
    return handleError(error, msg);
  }
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const createJobBoard = async (input: {
  label: string;
  websiteUrl?: string;
  description?: string;
}): Promise<any | undefined> => {
  try {
    await requireUser();

    const label = input.label?.trim();
    if (!label) {
      throw new Error("Job board name is required.");
    }

    const slug = slugify(label);
    if (!slug) {
      throw new Error("Job board name must contain at least one letter or number.");
    }

    const existing = await prisma.jobBoard.findUnique({ where: { slug } });
    if (existing) {
      throw new Error(`A job board named "${label}" already exists.`);
    }

    const maxSort = await prisma.jobBoard.aggregate({
      _max: { sortOrder: true },
    });

    const websiteUrl = input.websiteUrl?.trim() || null;

    const board = await prisma.jobBoard.create({
      data: {
        slug,
        label,
        websiteUrl,
        description: input.description?.trim() || null,
        // A board with a website URL can run via the generic custom-site
        // scraper (src/lib/scraper/custom) — only a board with no URL at
        // all stays catalog-only ("coming soon") until one is added.
        isSupported: !!websiteUrl,
        isActive: true,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
      },
    });

    return { data: board, success: true };
  } catch (error) {
    const msg = "Failed to create job board. ";
    return handleError(error, msg);
  }
};

export const updateJobBoard = async (
  jobBoardId: string,
  input: { label?: string; websiteUrl?: string; description?: string; isActive?: boolean },
): Promise<any | undefined> => {
  try {
    await requireUser();

    const existing = await prisma.jobBoard.findUnique({ where: { id: jobBoardId } });
    if (!existing) {
      throw new Error("Job board not found.");
    }

    const data: Record<string, unknown> = {};
    if (input.label !== undefined) {
      const label = input.label.trim();
      if (!label) throw new Error("Job board name cannot be empty.");
      data.label = label;
    }
    if (input.websiteUrl !== undefined) {
      const url = input.websiteUrl.trim() || null;
      data.websiteUrl = url;
      // Built-in boards (Greenhouse/Lever/Ashby/Indeed/Glassdoor/LinkedIn)
      // keep their dedicated scraper regardless of URL edits. Every other
      // board becomes runnable via the generic custom-site scraper once it
      // has a URL — and catalog-only again if the URL is cleared.
      if (!ATS_BOARDS.includes(existing.slug as (typeof ATS_BOARDS)[number])) {
        data.isSupported = !!url;
      }
    }
    if (input.description !== undefined) data.description = input.description.trim() || null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const board = await prisma.jobBoard.update({
      where: { id: jobBoardId },
      data,
    });

    return { data: board, success: true };
  } catch (error) {
    const msg = "Failed to update job board. ";
    return handleError(error, msg);
  }
};

export const deleteJobBoardById = async (
  jobBoardId: string,
): Promise<any | undefined> => {
  try {
    await requireUser();

    const board = await prisma.jobBoard.findUnique({ where: { id: jobBoardId } });
    if (!board) {
      throw new Error("Job board not found.");
    }

    if (ATS_BOARDS.includes(board.slug as (typeof ATS_BOARDS)[number])) {
      throw new Error(
        `"${board.label}" powers live automations and can't be deleted. You can deactivate it instead.`,
      );
    }

    const automationsUsingBoard = await prisma.automation.count({
      where: { jobBoard: board.slug },
    });
    if (automationsUsingBoard > 0) {
      throw new Error(
        `"${board.label}" is used by ${automationsUsingBoard} automation(s). Deactivate it instead of deleting.`,
      );
    }

    await prisma.jobBoard.delete({ where: { id: jobBoardId } });
    return { success: true };
  } catch (error) {
    const msg = "Failed to delete job board. ";
    return handleError(error, msg);
  }
};

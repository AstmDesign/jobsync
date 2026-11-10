"use server";

import db from "@/lib/db";
import { requireUser } from "../shared";
import { calculateNextRunAt } from "@/lib/scraper/schedule";
import {
  CreateAutomationSchema,
  UpdateAutomationSchema,
  type CreateAutomationInput,
  type UpdateAutomationInput,
} from "@/models/automation.schema";
import type { AutomationWithResume } from "@/models/automation.model";
import { isRetiredBoard } from "@/models/automation.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { syncSchedulerState } from "@/lib/scheduler";
import { formatError } from "./shared";
import {
  hasMinResumeSections,
  buildInsufficientSectionsMessage,
} from "@/lib/resumeSections";

// The wizard disables resumes that lack enough content, but the dropdown is
// not the security boundary: matching builds its prompt purely from
// ResumeSections (convertResumeForMatch), so an automation pointed at a
// section-less resume would score every job against an empty CV. Reject it
// here too.
async function validateAutomationResume(
  resumeId: string,
  userId: string,
): Promise<{ success: false; message: string } | null> {
  const resume = await db.resume.findFirst({
    where: { id: resumeId, profile: { userId } },
    select: { id: true, _count: { select: { ResumeSections: true } } },
  });

  if (!resume) {
    return {
      success: false,
      message: "Resume not found or doesn't belong to you",
    };
  }

  if (!hasMinResumeSections(resume._count?.ResumeSections)) {
    return {
      success: false,
      message: buildInsufficientSectionsMessage(
        "using this resume in an automation",
        "summary, experience, education or skills",
      ),
    };
  }

  return null;
}

export async function createAutomation(input: CreateAutomationInput): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const validated = CreateAutomationSchema.parse(input);

    const count = await db.automation.count({ where: { userId: user.id } });
    if (count >= APP_CONSTANTS.MAX_AUTOMATIONS_PER_USER) {
      return {
        success: false,
        message: `Maximum of ${APP_CONSTANTS.MAX_AUTOMATIONS_PER_USER} automations allowed per user`,
      };
    }

    // No slot-clash check: a slot may hold any number of automations, and the
    // scheduler runs the ones sharing it serially, oldest first.
    const resumeError = await validateAutomationResume(
      validated.resumeId,
      user.id,
    );
    if (resumeError) return resumeError;

    const nextRunAt = calculateNextRunAt(
      validated.scheduleHour,
      validated.scheduleMinute,
    );

    const automation = await db.automation.create({
      data: {
        userId: user.id,
        name: validated.name,
        jobBoard: validated.jobBoard,
        keywords: validated.keywords ?? "",
        location: validated.location ?? "",
        sourceConfig: validated.sourceConfig
          ? JSON.stringify(validated.sourceConfig)
          : null,
        resumeId: validated.resumeId,
        matchThreshold: validated.matchThreshold,
        scheduleHour: validated.scheduleHour,
        // The schema leaves the minute optional (see the comment there); a
        // caller that omits it means the top of the hour.
        scheduleMinute: validated.scheduleMinute ?? 0,
        nextRunAt,
        status: "active",
      },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    await syncSchedulerState();

    return {
      success: true,
      data: automation as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to create automation");
  }
}

export async function updateAutomation(
  id: string,
  input: UpdateAutomationInput,
): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const validated = UpdateAutomationSchema.parse(input);

    const existing = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, message: "Automation not found" };
    }

    if (isRetiredBoard(existing.jobBoard)) {
      return {
        success: false,
        message: `The ${existing.jobBoard} job board has been removed. This automation can only be deleted.`,
      };
    }

    if (validated.resumeId) {
      const resumeError = await validateAutomationResume(
        validated.resumeId,
        user.id,
      );
      if (resumeError) return resumeError;
    }

    const updateData: Record<string, unknown> = { ...validated };

    // sourceConfig is a parsed object in the validated input; the column is a
    // JSON string. Coalesce the legacy columns for greenhouse automations.
    if (validated.sourceConfig !== undefined) {
      updateData.sourceConfig = JSON.stringify(validated.sourceConfig);
    }
    if (validated.jobBoard) {
      updateData.keywords = validated.keywords ?? "";
      updateData.location = validated.location ?? "";
    }

    // Either half of the slot moving means the next run has to be recomputed,
    // and each half falls back to the stored value so changing only the minute
    // doesn't reset the hour. No clash check: a slot may hold any number of
    // automations, which the scheduler then runs serially, oldest first.
    if (
      validated.scheduleHour !== undefined ||
      validated.scheduleMinute !== undefined
    ) {
      updateData.nextRunAt = calculateNextRunAt(
        validated.scheduleHour ?? existing.scheduleHour,
        validated.scheduleMinute ?? existing.scheduleMinute,
      );
    }

    const automation = await db.automation.update({
      where: { id },
      data: updateData,
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    return {
      success: true,
      data: automation as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to update automation");
  }
}

export async function deleteAutomation(id: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const automation = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    await db.automation.delete({ where: { id } });

    await syncSchedulerState();

    return { success: true };
  } catch (error) {
    return formatError(error, "Failed to delete automation");
  }
}

export async function pauseAutomation(id: string): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const automation = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    const updated = await db.automation.update({
      where: { id },
      data: {
        status: "paused",
        nextRunAt: null,
      },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    await syncSchedulerState();

    return {
      success: true,
      data: updated as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to pause automation");
  }
}

export async function resumeAutomation(id: string): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const automation = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    const nextRunAt = calculateNextRunAt(
      automation.scheduleHour,
      automation.scheduleMinute,
    );

    const updated = await db.automation.update({
      where: { id },
      data: {
        status: "active",
        nextRunAt,
      },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    await syncSchedulerState();

    return {
      success: true,
      data: updated as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to resume automation");
  }
}

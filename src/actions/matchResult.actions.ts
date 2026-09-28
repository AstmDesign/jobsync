"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { requireUser } from "./shared";
import { APP_CONSTANTS } from "@/lib/constants";

export const getMatchResultList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.matchResult.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.matchResult.count({ where: { userId: user.id } }),
    ]);
    return { data, total, success: true };
  } catch (error) {
    const msg = "Failed to get match results list.";
    return handleError(error, msg);
  }
};

export const deleteMatchResultById = async (
  matchResultId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    await prisma.matchResult.delete({
      where: { id: matchResultId, userId: user.id },
    });
    revalidatePath("/dashboard/match-results");
    return { success: true };
  } catch (error) {
    const msg = "Failed to delete match result.";
    return handleError(error, msg);
  }
};

export const deleteMatchResultsByIds = async (
  matchResultIds: string[],
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const ids = [...new Set(matchResultIds)].filter(Boolean);
    if (ids.length === 0) throw new Error("At least one match result id is required");

    const res = await prisma.matchResult.deleteMany({
      where: { id: { in: ids }, userId: user.id },
    });
    revalidatePath("/dashboard/match-results");
    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete match results.";
    return handleError(error, msg);
  }
};

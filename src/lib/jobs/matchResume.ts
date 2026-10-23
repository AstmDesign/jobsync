import prisma from "@/lib/db";

/**
 * Pulls the resume id out of a serialized matchData blob and verifies it still
 * exists and belongs to the given user.
 *
 * `Job.matchResumeId` is a real foreign key, while `matchData` is an untyped
 * JSON string written by four different paths (automation scrape, manual
 * analyze, agent matchJob, MCP saveMatchResult). A stale or malformed blob must
 * not be able to break the write, so anything that doesn't resolve to a resume
 * the user owns comes back as null and the column is simply left unset.
 */
export async function resolveMatchResumeId(
  matchData: string | null | undefined,
  userId: string,
): Promise<string | null> {
  const resumeId = extractResumeId(matchData);
  if (!resumeId) return null;

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, profile: { userId } },
    select: { id: true },
  });
  return resume?.id ?? null;
}

/** Parse-only half of the above, for callers that already hold a resume id. */
export function extractResumeId(
  matchData: string | null | undefined,
): string | null {
  if (!matchData) return null;
  try {
    const parsed = JSON.parse(matchData);
    const id = parsed?.resumeId;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

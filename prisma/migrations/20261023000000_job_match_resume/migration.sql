-- Adds Job.matchResumeId: the resume a match score was actually produced
-- against. Nullable with no default, so SQLite allows a plain ADD COLUMN with
-- an inline FK rather than a full table redefine.
ALTER TABLE "Job" ADD COLUMN "matchResumeId" TEXT CONSTRAINT "Job_matchResumeId_fkey" REFERENCES "Resume" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Job_matchResumeId_idx" ON "Job"("matchResumeId");

-- Backfill from the resumeId every analyzed path already embedded in the
-- matchData JSON blob. Guarded by json_valid and by existence in Resume so a
-- malformed blob or a since-deleted resume can't trip the foreign key.
UPDATE "Job"
SET "matchResumeId" = json_extract("matchData", '$.resumeId')
WHERE "matchData" IS NOT NULL
  AND json_valid("matchData")
  AND json_extract("matchData", '$.resumeId') IN (SELECT "id" FROM "Resume");

-- Pre-rank / unanalyzed discovered rows carry no resumeId in matchData, but the
-- automation that found them knows which resume it was configured with.
UPDATE "Job"
SET "matchResumeId" = (
  SELECT "resumeId" FROM "Automation" WHERE "Automation"."id" = "Job"."automationId"
)
WHERE "matchResumeId" IS NULL
  AND "automationId" IS NOT NULL;

-- AlterTable: snapshot the job title/company on cover letters so they stay
-- reviewable after the job they were generated for is deleted.
ALTER TABLE "CoverLetter" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "CoverLetter" ADD COLUMN "company" TEXT;

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "jobTitle" TEXT NOT NULL,
    "company" TEXT,
    "matchScore" INTEGER,
    "matchData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MatchResult_userId_idx" ON "MatchResult"("userId");

-- CreateIndex
CREATE INDEX "MatchResult_jobId_idx" ON "MatchResult"("jobId");

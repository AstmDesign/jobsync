-- AlterTable: snapshot the resume used to generate this letter, so the
-- match-results-style pages can show which CV produced each cover letter
-- even after that resume is later deleted or swapped for another one.
ALTER TABLE "CoverLetter" ADD COLUMN "resumeId" TEXT;
ALTER TABLE "CoverLetter" ADD COLUMN "resumeTitle" TEXT;

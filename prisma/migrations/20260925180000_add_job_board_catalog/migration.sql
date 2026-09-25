-- CreateTable
CREATE TABLE "JobBoard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "websiteUrl" TEXT,
    "providerKey" TEXT,
    "isSupported" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "JobBoard_slug_key" ON "JobBoard"("slug");

-- Seed the boards that already have a working scraper (registry key matches
-- src/lib/scraper/ats/registry.ts) plus a starter catalog of well-known
-- boards that don't have scraper support yet, so the admin page and the
-- automation dropdown aren't empty on first load.
INSERT INTO "JobBoard" ("id", "slug", "label", "description", "websiteUrl", "providerKey", "isSupported", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    (lower(hex(randomblob(16))), 'greenhouse', 'Greenhouse (company boards)', 'Track specific companies'' Greenhouse job boards.', 'https://www.greenhouse.io', 'greenhouse', true, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (lower(hex(randomblob(16))), 'lever', 'Lever (company boards)', 'Track specific companies'' Lever job boards.', 'https://www.lever.co', 'lever', true, true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (lower(hex(randomblob(16))), 'ashby', 'Ashby (company boards)', 'Track specific companies'' Ashby job boards.', 'https://www.ashbyhq.com', 'ashby', true, true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (lower(hex(randomblob(16))), 'linkedin', 'LinkedIn', 'Scraper support not built yet — LinkedIn has no public per-company job API and actively blocks automated scraping.', 'https://www.linkedin.com/jobs', NULL, false, true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (lower(hex(randomblob(16))), 'indeed', 'Indeed', 'Scraper support not built yet.', 'https://www.indeed.com', NULL, false, true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (lower(hex(randomblob(16))), 'glassdoor', 'Glassdoor', 'Scraper support not built yet.', 'https://www.glassdoor.com', NULL, false, true, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Durable per-run log lines. Previously automation-logger.ts only kept logs
-- in an in-memory store (capped at 500 entries, evicted ~1hr after the run
-- ends), so Run History had no way to show what happened on an older run.
-- CreateTable
CREATE TABLE "AutomationRunLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    CONSTRAINT "AutomationRunLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AutomationRunLog_runId_idx" ON "AutomationRunLog"("runId");

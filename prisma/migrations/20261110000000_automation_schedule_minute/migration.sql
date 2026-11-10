-- Daily run slot moves to a 30-minute grid. Default 0 keeps every existing
-- automation on exactly the hour it already ran at.
ALTER TABLE "Automation" ADD COLUMN "scheduleMinute" INTEGER NOT NULL DEFAULT 0;

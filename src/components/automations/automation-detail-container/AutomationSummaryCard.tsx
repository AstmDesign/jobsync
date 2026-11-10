"use client";

import Link from "next/link";
import { AlertTriangle, Clock, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AutomationWithResume } from "@/models/automation.model";
import {
  formatScheduleInstant,
  formatScheduleTime,
  SCHEDULE_TIMEZONE_LABEL,
} from "@/lib/scraper/schedule";
import { AutomationSearchConfig } from "./AutomationSearchConfig";

interface AutomationSummaryCardProps {
  automation: AutomationWithResume;
  retired: boolean;
  resumeMissing: boolean;
  isRunning: boolean;
  totalJobs: number;
  newJobsCount: number;
}

export function AutomationSummaryCard({
  automation,
  retired,
  resumeMissing,
  isRunning,
  totalJobs,
  newJobsCount,
}: AutomationSummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  automation.status === "active" ? "default" : "secondary"
                }
              >
                {automation.status}
              </Badge>
              {isRunning && (
                <Badge variant="default" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Running
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Job Board</p>
            <p className="font-medium capitalize">{automation.jobBoard}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Match Threshold</p>
            <p className="font-medium">{automation.matchThreshold}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Schedule ({SCHEDULE_TIMEZONE_LABEL})
            </p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatScheduleTime(
                automation.scheduleHour,
                automation.scheduleMinute,
              )}{" "}
              daily
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Resume</p>
            {resumeMissing ? (
              <p className="text-amber-600 flex items-center gap-1 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Missing
              </p>
            ) : (
              <Link
                href={`/dashboard/profile/resume/${automation.resume.id}`}
                className="font-medium flex items-center gap-1 hover:underline"
              >
                <FileText className="h-4 w-4" />
                {automation.resume.title}
              </Link>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Next Run</p>
            <p className="font-medium">
              {automation.nextRunAt && automation.status === "active"
                ? formatScheduleInstant(automation.nextRunAt)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Run</p>
            <p className="font-medium">
              {automation.lastRunAt
                ? formatScheduleInstant(automation.lastRunAt)
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Discovered Jobs</p>
            <p className="font-medium">
              {totalJobs} total
              {newJobsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {newJobsCount} new
                </Badge>
              )}
            </p>
          </div>
        </div>

        <AutomationSearchConfig
          sourceConfig={automation.sourceConfig}
          jobBoard={automation.jobBoard}
          retired={retired}
        />
      </CardContent>
    </Card>
  );
}

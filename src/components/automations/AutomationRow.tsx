"use client";

import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Pause,
  Play,
  Pencil,
  Trash2,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
  PlayCircle,
} from "lucide-react";
import type { AutomationWithResume } from "@/models/automation.model";
import { isRetiredBoard } from "@/models/automation.model";
import { APP_CONSTANTS } from "@/lib/constants";

// One automation card. Split out of AutomationList when that list became
// grouped — the list now owns grouping and collapse state, this owns a row.
export function AutomationRow({
  automation,
  isLoading,
  onPause,
  onResume,
  onRunNow,
  onEdit,
  onRequestDelete,
}: {
  automation: AutomationWithResume;
  isLoading: boolean;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRunNow: (id: string) => void;
  onEdit: (automation: AutomationWithResume) => void;
  onRequestDelete: (id: string) => void;
}) {
  const resumeMissing = !automation.resume;
  const retired = isRetiredBoard(automation.jobBoard);

  const ats = (() => {
    try {
      return JSON.parse(automation.sourceConfig ?? "{}")[automation.jobBoard];
    } catch {
      return null;
    }
  })();
  const atsCompanies: { name: string; token: string }[] = ats?.companies ?? [];
  const atsTitles: string[] = ats?.targetTitles ?? [];
  const atsLocations: string[] = ats?.locations ?? [];
  const atsKeywords: string[] = ats?.keywords ?? [];
  const atsTopK: number = ats?.topK ?? APP_CONSTANTS.MAX_JOBS_PER_RUN;
  const atsSaveUnanalyzed: boolean = ats?.saveUnanalyzed !== false;

  return (
    <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={`/dashboard/automations/${automation.id}`}
            className="font-semibold hover:underline"
          >
            {automation.name}
          </Link>
          <Badge variant="outline" className="capitalize">
            {automation.jobBoard}
          </Badge>
          {retired ? (
            <Badge variant="destructive">Retired</Badge>
          ) : (
            <Badge
              variant={
                automation.status === "active" ? "default" : "secondary"
              }
            >
              {automation.status}
            </Badge>
          )}
        </div>

        {retired && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              This job board was removed and no longer runs. Delete this
              automation.
            </span>
          </div>
        )}

        {!retired && resumeMissing && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Resume missing - select a new one</span>
          </div>
        )}

        {!retired && (
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1">
              {atsCompanies.slice(0, 3).map((c) => (
                <Badge key={c.token} variant="secondary">
                  {c.name}
                </Badge>
              ))}
              {atsCompanies.length > 3 && (
                <Badge variant="secondary">
                  +{atsCompanies.length - 3} more
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                <span className="font-medium text-foreground">Titles:</span>{" "}
                {atsTitles.length ? atsTitles.join(", ") : "Not set"}
              </span>
              <span>
                <span className="font-medium text-foreground">Keywords:</span>{" "}
                {atsKeywords.length ? atsKeywords.join(", ") : "Any"}
              </span>
              <span>
                <span className="font-medium text-foreground">Location:</span>{" "}
                {atsLocations.length
                  ? atsLocations.join(", ")
                  : "Any location"}
              </span>
              <span>
                <span className="font-medium text-foreground">
                  Analyzed/run:
                </span>{" "}
                {atsTopK}
              </span>
              <span>
                <span className="font-medium text-foreground">
                  Extra listings:
                </span>{" "}
                {atsSaveUnanalyzed ? "on" : "off"}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {automation.scheduleHour.toString().padStart(2, "0")}:00 daily
            </span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{automation.matchThreshold}% threshold</span>
          </div>
          {!retired &&
            automation.nextRunAt &&
            automation.status === "active" && (
              <span className="text-xs">
                Next:{" "}
                {format(new Date(automation.nextRunAt), "MMM d, h:mm a")}
              </span>
            )}
          {automation.lastRunAt && (
            <span className="text-xs">
              Last: {format(new Date(automation.lastRunAt), "MMM d, h:mm a")}
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={isLoading}
            aria-label={`Actions for ${automation.name}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!retired &&
            (automation.status === "active" ? (
              <DropdownMenuItem onClick={() => onPause(automation.id)}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => onResume(automation.id)}
                disabled={resumeMissing}
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </DropdownMenuItem>
            ))}
          {!retired && (
            <DropdownMenuItem
              onClick={() => onRunNow(automation.id)}
              disabled={resumeMissing || automation.status === "paused"}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Run Now
            </DropdownMenuItem>
          )}
          {!retired && (
            <>
              <DropdownMenuItem onClick={() => onEdit(automation)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onRequestDelete(automation.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

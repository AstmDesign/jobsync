"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
} from "lucide-react";
import { getAutomationRunLogs } from "@/actions/automation.actions";
import type { LogLevel } from "@/lib/automation-logger";

interface RunLog {
  timestamp: Date | string;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
}

interface RunLogsDialogProps {
  runId: string | null;
  onOpenChange: (open: boolean) => void;
}

const LEVEL_ICON: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const LEVEL_COLOR: Record<string, string> = {
  info: "text-blue-600 dark:text-blue-400",
  success: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
};

const LEVEL_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive"
> = {
  info: "default",
  success: "default",
  warning: "secondary",
  error: "destructive",
};

// Reads the durable per-run log rows (AutomationRunLog, written by
// automation-logger.ts) — unlike LogsTab's live SSE view, this works for any
// past run, not just the one currently in flight or still within the
// in-memory store's 1hr retention window.
export function RunLogsDialog({ runId, onOpenChange }: RunLogsDialogProps) {
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLogs([]);

    getAutomationRunLogs(runId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data) {
        setLogs(res.data as RunLog[]);
      } else {
        setError(res.message || "Failed to load logs");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [runId]);

  return (
    <Dialog open={!!runId} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Run Logs</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[500px] w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full py-12">
              <Spinner className="h-6 w-6" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full py-12 text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-full py-12 text-muted-foreground">
              <p>No logs recorded for this run.</p>
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs pr-3">
              {logs.map((log, index) => {
                const level = log.level as LogLevel;
                const Icon = LEVEL_ICON[level] || Info;
                return (
                  <div
                    key={index}
                    className="flex gap-2 p-2 rounded-sm border hover:bg-muted/50"
                  >
                    <div className="shrink-0 pt-0.5">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-muted-foreground">
                          {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                        </span>
                        <Badge
                          variant={LEVEL_BADGE_VARIANT[level] || "default"}
                          className="text-xs"
                        >
                          {log.level}
                        </Badge>
                      </div>
                      <div className={LEVEL_COLOR[level] || ""}>
                        {log.message}
                      </div>
                      {log.metadata &&
                        Object.keys(log.metadata).length > 0 && (
                          <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

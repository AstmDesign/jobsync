"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toastSuccess, toastError } from "@/lib/toast";
import { ChevronRight, FileText, Zap } from "lucide-react";
import type { AutomationWithResume } from "@/models/automation.model";
import {
  deleteAutomation,
  pauseAutomation,
  resumeAutomation,
} from "@/actions/automation.actions";
import { AutomationRow } from "./AutomationRow";
import { groupAutomationsByResume } from "./groupAutomationsByResume";

interface AutomationListProps {
  automations: AutomationWithResume[];
  onEdit: (automation: AutomationWithResume) => void;
  onRefresh: () => void;
}

export function AutomationList({
  automations,
  onEdit,
  onRefresh,
}: AutomationListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  // Only the keys the user has opened. Starting from an empty set is what
  // makes every group collapsed by default, and it survives onRefresh because
  // this component isn't remounted when the parent reloads the list.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => groupAutomationsByResume(automations),
    [automations],
  );

  // Grouping only earns its keep with more than one resume. With exactly one,
  // an all-collapsed default would show a single header and nothing else, so
  // that group opens itself — once, and never again after the user has
  // touched a header.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || groups.length !== 1) return;
    autoOpened.current = true;
    setOpenGroups(new Set([groups[0].key]));
  }, [groups]);

  const toggleGroup = (key: string) => {
    autoOpened.current = true;
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePause = async (id: string) => {
    setLoadingAction(id);
    const result = await pauseAutomation(id);
    setLoadingAction(null);

    if (result.success) {
      toastSuccess("Automation paused");
      onRefresh();
    } else {
      toastError(result.message);
    }
  };

  const handleResume = async (id: string) => {
    setLoadingAction(id);
    const result = await resumeAutomation(id);
    setLoadingAction(null);

    if (result.success) {
      toastSuccess("Automation resumed");
      onRefresh();
    } else {
      toastError(result.message);
    }
  };

  const handleRunNow = async (id: string) => {
    setLoadingAction(id);

    try {
      const response = await fetch(`/api/automations/${id}/run`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        toastError(data.message || "Failed to start automation");
        return;
      }

      toastSuccess("Automation started. Open it to follow progress.");
    } catch {
      toastError("Failed to start automation");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteAutomation(deleteId);
    setIsDeleting(false);
    setDeleteId(null);

    if (result.success) {
      toastSuccess("Automation deleted");
      onRefresh();
    } else {
      toastError(result.message);
    }
  };

  if (automations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Zap className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No automations yet</h3>
          <p className="text-muted-foreground text-center mt-2">
            Create your first automation to start discovering jobs
            automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = openGroups.has(group.key);
          return (
            <Collapsible
              key={group.key}
              open={isOpen}
              onOpenChange={() => toggleGroup(group.key)}
              className="rounded-lg border bg-muted/30"
            >
              <CollapsibleTrigger
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/60 rounded-lg transition-colors"
                data-testid={`automation-group-${group.key}`}
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-semibold truncate">{group.title}</span>
                <Badge variant="secondary" className="shrink-0">
                  {group.automations.length}
                </Badge>
                {/* Collapsed is the default, so the header has to say enough
                    that you don't need to open every group to find what's
                    running. */}
                {group.activeCount > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {group.activeCount} active
                  </span>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 p-3 pt-0">
                {group.automations.map((automation) => (
                  <AutomationRow
                    key={automation.id}
                    automation={automation}
                    isLoading={loadingAction === automation.id}
                    onPause={handlePause}
                    onResume={handleResume}
                    onRunNow={handleRunNow}
                    onEdit={onEdit}
                    onRequestDelete={setDeleteId}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation? This action
              cannot be undone. Discovered jobs will remain but lose their
              automation reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

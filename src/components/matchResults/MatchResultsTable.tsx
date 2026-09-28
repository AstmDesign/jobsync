"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Check, Copy, Eye, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { CircularScore } from "@/components/CircularScore";
import { MatchDetails } from "@/components/automations/MatchDetails";
import { MatchResult } from "@/models/matchResult.model";
import type { JobMatchData } from "@/models/ai.schemas";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  deleteMatchResultById,
  deleteMatchResultsByIds,
} from "@/actions/matchResult.actions";

type MatchResultsTableProps = {
  results: MatchResult[];
  reload: () => void;
};

function parseMatchData(raw: string): JobMatchData | null {
  try {
    return JSON.parse(raw) as JobMatchData;
  } catch {
    return null;
  }
}

export function MatchResultsTable({ results, reload }: MatchResultsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [viewing, setViewing] = useState<MatchResult | null>(null);

  const toggleSelected = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  const allSelected = results.length > 0 && results.every((r) => selectedIds.includes(r.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : results.map((r) => r.id));

  const onDelete = (id: string) => {
    setIdToDelete(id);
    setAlertOpen(true);
  };

  const performDelete = async () => {
    const { success, message } = await deleteMatchResultById(idToDelete);
    if (success) {
      toastSuccess("Match result has been deleted successfully");
      reload();
    } else {
      toastError(message);
    }
  };

  const performBulkDelete = async () => {
    const { success, message } = await deleteMatchResultsByIds(selectedIds);
    if (success) {
      toastSuccess(`${selectedIds.length} match results have been deleted successfully`);
      setSelectedIds([]);
      reload();
    } else {
      toastError(message);
    }
  };

  const copyBody = async (result: MatchResult) => {
    const parsed = parseMatchData(result.matchData);
    const text = parsed?.body ?? "";
    if (!text) {
      toastError("Nothing to copy for this match result.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess("Match analysis copied to clipboard");
    } catch {
      toastError("Couldn't copy to clipboard. Please try again.");
    }
  };

  const viewingData = useMemo(
    () => (viewing ? parseMatchData(viewing.matchData) : null),
    [viewing],
  );

  return (
    <>
      <div className="flex items-center gap-2 pb-3">
        <button
          type="button"
          aria-label="Select all match results"
          onClick={toggleAll}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
        >
          {allSelected && <Check className="h-3 w-3" />}
        </button>
        <span className="text-xs text-muted-foreground">Select all</span>
        {selectedIds.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
            <button
              type="button"
              aria-label={`Delete ${selectedIds.length} selected match results`}
              onClick={() => setBulkDeleteOpen(true)}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <span className="sr-only">Select</span>
            </TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead className="hidden md:table-cell">Company</TableHead>
            <TableHead className="hidden lg:table-cell">Resume Used</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead className="hidden md:table-cell whitespace-nowrap">Matched On</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => {
            const parsed = parseMatchData(result.matchData);
            return (
              <TableRow key={result.id}>
                <TableCell className="w-10">
                  <button
                    type="button"
                    aria-label={`Select ${result.jobTitle}`}
                    onClick={() => toggleSelected(result.id)}
                    className="flex h-4 w-4 items-center justify-center rounded border"
                  >
                    {selectedIds.includes(result.id) && <Check className="h-3 w-3" />}
                  </button>
                </TableCell>
                <TableCell className="font-medium max-w-[160px] md:max-w-[280px]">
                  {result.jobId ? (
                    <Link
                      href={`/dashboard/myjobs/${result.jobId}`}
                      className="block truncate hover:underline"
                    >
                      {result.jobTitle}
                    </Link>
                  ) : (
                    <span className="block truncate text-muted-foreground">
                      {result.jobTitle}
                      <span className="ml-1 text-xs">(job deleted)</span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-[160px]">
                  <span className="block truncate">{result.company}</span>
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[160px]">
                  {parsed?.resumeTitle ? (
                    parsed.resumeId ? (
                      <Link
                        href={`/dashboard/profile/resume/${parsed.resumeId}`}
                        className="block truncate hover:underline"
                      >
                        {parsed.resumeTitle}
                      </Link>
                    ) : (
                      <span className="block truncate">{parsed.resumeTitle}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {result.matchScore != null && (
                    <CircularScore score={result.matchScore} size="sm" animate={false} className="mx-auto" />
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap">
                  {result.createdAt ? format(result.createdAt, "PPp") : "N/A"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="View match details"
                      onClick={() => setViewing(result)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copy match analysis"
                      onClick={() => copyBody(result)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete match result"
                      className="text-destructive hover:text-destructive/80"
                      onClick={() => onDelete(result.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewing?.jobTitle}
              {viewing?.company ? ` · ${viewing.company}` : ""}
            </DialogTitle>
          </DialogHeader>
          <MatchDetails matchData={viewingData} />
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        pageTitle="match result"
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={performDelete}
      />
      <DeleteAlertDialog
        pageTitle="selected match results"
        alertTitle={`Are you sure you want to delete ${selectedIds.length} match results?`}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDelete={performBulkDelete}
      />
    </>
  );
}

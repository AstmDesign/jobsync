"use client";
import { useState } from "react";
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
import { TipTapContentViewer } from "@/components/TipTapContentViewer";
import { CoverLetter } from "@/models/profile.model";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  deleteCoverLetterById,
  deleteCoverLettersByIds,
} from "@/actions/coverLetter.actions";

type GeneratedCoverLettersTableProps = {
  letters: CoverLetter[];
  reload: () => void;
};

// Cover letter content is stored as sanitized HTML (rendered from markdown at
// generation time). Copy needs plain text, so block-level tags are turned
// into line breaks before the DOM is asked for textContent.
function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
  if (typeof window === "undefined") {
    return withBreaks.replace(/<[^>]+>/g, "");
  }
  const doc = new DOMParser().parseFromString(withBreaks, "text/html");
  return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

export function GeneratedCoverLettersTable({
  letters,
  reload,
}: GeneratedCoverLettersTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [viewing, setViewing] = useState<CoverLetter | null>(null);

  const toggleSelected = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  const allSelected = letters.length > 0 && letters.every((l) => selectedIds.includes(l.id!));
  const toggleAll = () => setSelectedIds(allSelected ? [] : letters.map((l) => l.id!));

  const onDelete = (id: string) => {
    setIdToDelete(id);
    setAlertOpen(true);
  };

  const performDelete = async () => {
    const { success, message } = await deleteCoverLetterById(idToDelete);
    if (success) {
      toastSuccess("Cover letter has been deleted successfully");
      reload();
    } else {
      toastError(message);
    }
  };

  const performBulkDelete = async () => {
    const { success, message } = await deleteCoverLettersByIds(selectedIds);
    if (success) {
      toastSuccess(`${selectedIds.length} cover letters have been deleted successfully`);
      setSelectedIds([]);
      reload();
    } else {
      toastError(message);
    }
  };

  const copyContent = async (letter: CoverLetter) => {
    const text = htmlToPlainText(letter.content);
    if (!text) {
      toastError("Nothing to copy for this cover letter.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess("Cover letter copied to clipboard");
    } catch {
      toastError("Couldn't copy to clipboard. Please try again.");
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 pb-3">
        <button
          type="button"
          aria-label="Select all cover letters"
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
              aria-label={`Delete ${selectedIds.length} selected cover letters`}
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
            <TableHead className="hidden md:table-cell whitespace-nowrap">Created</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {letters.map((letter) => {
            const jobId = letter.Job?.[0]?.id;
            return (
              <TableRow key={letter.id}>
                <TableCell className="w-10">
                  <button
                    type="button"
                    aria-label={`Select ${letter.jobTitle ?? letter.title}`}
                    onClick={() => toggleSelected(letter.id!)}
                    className="flex h-4 w-4 items-center justify-center rounded border"
                  >
                    {selectedIds.includes(letter.id!) && <Check className="h-3 w-3" />}
                  </button>
                </TableCell>
                <TableCell className="font-medium max-w-[160px] md:max-w-[280px]">
                  {jobId ? (
                    <Link
                      href={`/dashboard/myjobs/${jobId}`}
                      className="block truncate hover:underline"
                    >
                      {letter.jobTitle ?? letter.title}
                    </Link>
                  ) : (
                    <span className="block truncate text-muted-foreground">
                      {letter.jobTitle ?? letter.title}
                      {letter.jobTitle && (
                        <span className="ml-1 text-xs">(job deleted)</span>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-[160px]">
                  <span className="block truncate">{letter.company}</span>
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[160px]">
                  {letter.resumeTitle ? (
                    letter.resumeId ? (
                      <Link
                        href={`/dashboard/profile/resume/${letter.resumeId}`}
                        className="block truncate hover:underline"
                      >
                        {letter.resumeTitle}
                      </Link>
                    ) : (
                      <span className="block truncate">{letter.resumeTitle}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap">
                  {letter.createdAt ? format(letter.createdAt, "PPp") : "N/A"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="View cover letter"
                      onClick={() => setViewing(letter)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copy cover letter"
                      onClick={() => copyContent(letter)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete cover letter"
                      className="text-destructive hover:text-destructive/80"
                      onClick={() => onDelete(letter.id!)}
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
              {viewing?.jobTitle ?? viewing?.title}
              {viewing?.company ? ` · ${viewing.company}` : ""}
            </DialogTitle>
          </DialogHeader>
          {viewing && <TipTapContentViewer content={viewing.content} />}
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        pageTitle="cover letter"
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={performDelete}
      />
      <DeleteAlertDialog
        pageTitle="selected cover letters"
        alertTitle={`Are you sure you want to delete ${selectedIds.length} cover letters?`}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDelete={performBulkDelete}
      />
    </>
  );
}

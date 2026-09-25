"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { MoreVertical, Pencil, Trash, ExternalLink } from "lucide-react";
import { AlertDialog } from "@/models/alertDialog.model";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { deleteJobBoardById, updateJobBoard } from "@/actions/jobBoard.actions";
import { toastSuccess, toastError } from "@/lib/toast";
import type { JobBoardCatalogEntry } from "@/models/automation.model";
import AddJobBoard from "./AddJobBoard";

type JobBoardsTableProps = {
  jobBoards: JobBoardCatalogEntry[];
  reloadJobBoards: () => void;
};

function JobBoardsTable({ jobBoards, reloadJobBoards }: JobBoardsTableProps) {
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });
  const [editingBoard, setEditingBoard] = useState<JobBoardCatalogEntry | null>(
    null,
  );

  const onDeleteJobBoard = (board: JobBoardCatalogEntry) => {
    setAlert({
      openState: true,
      deleteAction: true,
      itemId: board.id,
    });
  };

  const deleteJobBoard = async (jobBoardId: string) => {
    if (jobBoardId) {
      const result = await deleteJobBoardById(jobBoardId);
      if (result?.success) {
        toastSuccess("Job board has been deleted successfully.");
        reloadJobBoards();
      } else {
        toastError(result?.message ?? "Failed to delete job board.");
      }
    }
  };

  const toggleActive = async (board: JobBoardCatalogEntry, isActive: boolean) => {
    const result = await updateJobBoard(board.id, { isActive });
    if (result?.success) {
      reloadJobBoards();
    } else {
      toastError(result?.message ?? "Failed to update job board.");
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Website</TableHead>
            <TableHead>Scraping</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobBoards.map((board) => (
            <TableRow key={board.id}>
              <TableCell className="font-medium">
                {board.label}
                {board.description && (
                  <p className="text-xs text-muted-foreground font-normal mt-0.5 line-clamp-1">
                    {board.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {board.websiteUrl ? (
                  <a
                    href={board.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
                  >
                    {board.websiteUrl.replace(/^https?:\/\//i, "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {board.isSupported ? (
                  <Badge variant="default">Supported</Badge>
                ) : (
                  <Badge variant="secondary">Coming soon</Badge>
                )}
              </TableCell>
              <TableCell>
                <Switch
                  checked={board.isActive}
                  onCheckedChange={(checked) => toggleActive(board, checked)}
                  aria-label={`Toggle ${board.label} active`}
                />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setEditingBoard(board)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 cursor-pointer"
                      onClick={() => onDeleteJobBoard(board)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DeleteAlertDialog
        pageTitle="job board"
        open={alert.openState}
        onOpenChange={() => setAlert({ openState: false, deleteAction: false })}
        onDelete={() => deleteJobBoard(alert.itemId!)}
        alertTitle={alert.title}
        alertDescription={alert.description}
        deleteAction={alert.deleteAction}
      />
      <AddJobBoard
        reloadJobBoards={reloadJobBoards}
        editingBoard={editingBoard}
        open={editingBoard !== null}
        onOpenChange={(open) => {
          if (!open) setEditingBoard(null);
        }}
      />
    </>
  );
}

export default JobBoardsTable;

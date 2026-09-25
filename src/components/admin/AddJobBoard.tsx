"use client";
import { useTransition, useState, useEffect } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Loader, PlusCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { toastSuccess, toastError } from "@/lib/toast";
import { createJobBoard, updateJobBoard } from "@/actions/jobBoard.actions";
import type { JobBoardCatalogEntry } from "@/models/automation.model";

const JobBoardFormSchema = z.object({
  label: z
    .string({ error: "Job board name is required." })
    .min(1, { message: "Job board name cannot be empty." })
    .max(80, { message: "Job board name must be 80 characters or fewer." }),
  websiteUrl: z
    .string()
    .max(300)
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), {
      message: "Website URL must start with http:// or https://",
    }),
  description: z.string().max(300).optional(),
});

type JobBoardFormValues = z.infer<typeof JobBoardFormSchema>;

type AddJobBoardProps = {
  reloadJobBoards: () => void;
  editingBoard?: JobBoardCatalogEntry | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function AddJobBoard({
  reloadJobBoards,
  editingBoard,
  open,
  onOpenChange,
}: AddJobBoardProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    if (!isControlled) setInternalOpen(value);
  };

  const form = useForm<JobBoardFormValues>({
    resolver: zodResolver(JobBoardFormSchema),
    defaultValues: { label: "", websiteUrl: "", description: "" },
  });

  const { reset } = form;

  useEffect(() => {
    if (dialogOpen) {
      reset({
        label: editingBoard?.label ?? "",
        websiteUrl: editingBoard?.websiteUrl ?? "",
        description: editingBoard?.description ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editingBoard?.id]);

  const openDialog = () => setDialogOpen(true);

  const onSubmit = (values: JobBoardFormValues) => {
    startTransition(async () => {
      const result = editingBoard
        ? await updateJobBoard(editingBoard.id, values)
        : await createJobBoard(values);

      if (result?.success) {
        toastSuccess(
          editingBoard
            ? "Job board has been updated successfully."
            : "Job board has been added successfully.",
        );
        setDialogOpen(false);
        reloadJobBoards();
      } else {
        toastError(
          result?.message ??
            `Failed to ${editingBoard ? "update" : "create"} job board.`,
        );
      }
    });
  };

  return (
    <>
      {!isControlled && (
        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={openDialog}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            New Job Board
          </span>
        </Button>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBoard ? "Edit Job Board" : "Add New Job Board"}
            </DialogTitle>
            <DialogDescription>
              {editingBoard
                ? "Update this job board's details."
                : "Add a job board site to the catalog. New boards are catalog-only until a scraper is built for them — they'll show as \"Coming soon\" in automations."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. LinkedIn, Indeed, Glassdoor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.linkedin.com/jobs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any notes about this board"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  Save
                  {isPending && <Loader className="ml-2 h-4 w-4 shrink-0 spinner" />}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddJobBoard;

"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, StickyNote, Trash2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { JobResponse, JobStatus } from "@/models/job.model";
import Link from "next/link";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { CircularScore } from "@/components/CircularScore";
import { JobStatusBadgeMenu } from "./JobStatusBadgeMenu";
import { TooltipProvider } from "../ui/tooltip";
import { JobActionsMenu } from "./JobActionsMenu";
import { MatchJobButton } from "./MatchJobButton";
import { CompanyLogo } from "./CompanyLogo";
import { Button } from "../ui/button";

type MyJobsTableProps = {
  jobs: JobResponse[];
  jobStatuses: JobStatus[];
  deleteJob: (id: string) => void;
  deleteJobs: (ids: string[]) => void;
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
};

function MyJobsTable({
  jobs,
  jobStatuses,
  deleteJob,
  deleteJobs,
  editJob,
  onChangeJobStatus,
  onAddNote,
}: MyJobsTableProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "createdAt", direction: "desc" });

  const sortedJobs = [...jobs].sort((left, right) => {
    const value = (job: JobResponse) => {
      switch (sort.key) {
        case "title": return job.JobTitle?.label ?? "";
        case "company": return job.Company?.label ?? "";
        case "location": return job.Location?.label ?? "";
        case "status": return job.Status?.label ?? "";
        case "match": return job.matchScore ?? -1;
        case "source": return job.JobSource?.label ?? "";
        case "appliedDate": return job.appliedDate?.getTime() ?? 0;
        case "createdAt": return job.createdAt?.getTime() ?? 0;
        case "discoveredAt": return job.discoveredAt?.getTime() ?? 0;
        default: return "";
      }
    };
    const leftValue = value(left);
    const rightValue = value(right);
    const comparison = typeof leftValue === "string" && typeof rightValue === "string"
      ? leftValue.localeCompare(rightValue)
      : Number(leftValue) - Number(rightValue);
    return sort.direction === "asc" ? comparison : -comparison;
  });

  const toggleSort = (key: string) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));
  const sortIcon = (key: string) => sort.key !== key ? <ArrowUpDown className="h-3.5 w-3.5" /> : sort.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  const toggleSelected = (jobId: string) => setSelectedJobIds((current) => current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId]);
  const allVisibleSelected = jobs.length > 0 && jobs.every((job) => selectedJobIds.includes(job.id));
  const toggleAll = () => setSelectedJobIds(allVisibleSelected ? [] : jobs.map((job) => job.id));
  const sortableHead = (label: string, key: string, className?: string) => (
    <TableHead className={className}>
      <button type="button" aria-label={`Sort ${key === "match" ? "score" : label} column`} className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(key)}>
        {label}{sortIcon(key)}<span className="sr-only">Sort by {label}</span>
      </button>
    </TableHead>
  );

  const onDeleteJob = (jobId: string) => {
    setAlertOpen(true);
    setJobIdToDelete(jobId);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <button type="button" aria-label="Select all jobs" onClick={toggleAll} className="flex h-4 w-4 items-center justify-center rounded border">
                {allVisibleSelected && <Check className="h-3 w-3" />}
              </button>
            </TableHead>
            <TableHead className="hidden w-[100px] sm:table-cell">
              <span className="sr-only">Company Logo</span>
            </TableHead>
            {sortableHead("Date Applied", "appliedDate", "hidden md:table-cell")}
            {sortableHead("Title", "title")}
            {sortableHead("Company", "company")}
            {sortableHead("Created", "createdAt", "hidden md:table-cell")}
            {sortableHead("Synced", "discoveredAt", "hidden md:table-cell")}
            {sortableHead("Location", "location", "hidden md:table-cell")}
            {sortableHead("Status", "status")}
            {sortableHead("Match", "match", "hidden md:table-cell text-center")}
            {sortableHead("Source", "source", "hidden md:table-cell")}
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobs.map((job: JobResponse) => {
            return (
              <TableRow key={job.id}>
                <TableCell className="w-10">
                  <button type="button" aria-label={`Select ${job.JobTitle?.label ?? "job"}`} onClick={() => toggleSelected(job.id)} className="flex h-4 w-4 items-center justify-center rounded border">
                    {selectedJobIds.includes(job.id) && <Check className="h-3 w-3" />}
                  </button>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <CompanyLogo
                    logoUrl={job.Company?.logoUrl}
                    className="h-8 w-8 min-w-8"
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell w-[120px] whitespace-nowrap">
                  {job.appliedDate ? format(job.appliedDate, "PP") : "N/A"}
                </TableCell>
                <TableCell
                  className="font-medium cursor-pointer max-w-[120px] md:max-w-[220px]"
                >
                  <div className="flex items-center gap-1.5">
                    <Link href={`/dashboard/myjobs/${job?.id}`} className="block truncate">
                      {job.JobTitle?.label}
                    </Link>
                    {(job._count?.Notes ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 shrink-0">
                        <StickyNote className="h-3 w-3 mr-0.5" />
                        {job._count!.Notes}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium max-w-[100px] md:max-w-[160px]">
                  <span className="block truncate">{job.Company?.label}</span>
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap">{job.createdAt ? format(job.createdAt, "PPp") : "N/A"}</TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap">{job.discoveredAt ? format(job.discoveredAt, "PPp") : "N/A"}</TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap max-w-[120px]">
                  <span className="block truncate">{job.Location?.label}</span>
                </TableCell>
                <TableCell>
                  <JobStatusBadgeMenu
                    job={job}
                    jobStatuses={jobStatuses}
                    onChangeJobStatus={onChangeJobStatus}
                    className="w-[110px] whitespace-nowrap justify-center"
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell text-center">
                  {job.matchScore != null ? (
                    <CircularScore
                      score={job.matchScore}
                      size="sm"
                      animate={false}
                      className="mx-auto"
                    />
                  ) : (
                    <MatchJobButton jobId={job.id} />
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {job.JobSource?.label}
                </TableCell>
                <TableCell>
                  <JobActionsMenu
                    job={job}
                    jobStatuses={jobStatuses}
                    editJob={editJob}
                    onChangeJobStatus={onChangeJobStatus}
                    onAddNote={onAddNote}
                    onDeleteJob={onDeleteJob}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {selectedJobIds.length > 0 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-sm text-muted-foreground">{selectedJobIds.length} selected</span>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}><Trash2 />Delete selected</Button>
        </div>
      )}
      <DeleteAlertDialog
        pageTitle="job"
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={() => deleteJob(jobIdToDelete)}
      />
      <DeleteAlertDialog
        pageTitle="selected jobs"
        alertTitle={`Are you sure you want to delete ${selectedJobIds.length} jobs?`}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDelete={() => { deleteJobs(selectedJobIds); setSelectedJobIds([]); }}
      />
    </TooltipProvider>
  );
}

export default MyJobsTable;

"use client";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { JobResponse, JobStatus } from "@/models/job.model";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { JobCard } from "./JobCard";

type MyJobsGridProps = {
  jobs: JobResponse[];
  jobStatuses: JobStatus[];
  deleteJob: (id: string) => void;
  deleteJobs: (ids: string[]) => void;
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
};

function MyJobsGrid({
  jobs,
  jobStatuses,
  deleteJob,
  deleteJobs,
  editJob,
  onChangeJobStatus,
  onAddNote,
}: MyJobsGridProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const onDeleteJob = (jobId: string) => {
    setAlertOpen(true);
    setJobIdToDelete(jobId);
  };

  const toggleSelected = (jobId: string) =>
    setSelectedJobIds((current) =>
      current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId],
    );
  const allSelected = jobs.length > 0 && jobs.every((job) => selectedJobIds.includes(job.id));
  const toggleAll = () => setSelectedJobIds(allSelected ? [] : jobs.map((job) => job.id));

  return (
    <>
      <div className="flex items-center gap-2 pb-3">
        <button
          type="button"
          aria-label="Select all jobs"
          onClick={toggleAll}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
        >
          {allSelected && <Check className="h-3 w-3" />}
        </button>
        <span className="text-xs text-muted-foreground">Select all</span>
        {selectedJobIds.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{selectedJobIds.length} selected</span>
            <button
              type="button"
              aria-label={`Delete ${selectedJobIds.length} selected jobs`}
              onClick={() => setBulkDeleteOpen(true)}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {jobs.map((job: JobResponse) => (
          <JobCard
            key={job.id}
            job={job}
            jobStatuses={jobStatuses}
            editJob={editJob}
            onChangeJobStatus={onChangeJobStatus}
            onAddNote={onAddNote}
            onDeleteJob={onDeleteJob}
            selected={selectedJobIds.includes(job.id)}
            onToggleSelect={toggleSelected}
          />
        ))}
      </div>
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
        onDelete={() => {
          deleteJobs(selectedJobIds);
          setSelectedJobIds([]);
        }}
      />
    </>
  );
}

export default MyJobsGrid;

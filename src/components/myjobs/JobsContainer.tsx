"use client";
import { useState } from "react";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Loader } from "lucide-react";
import {
  deleteJobById,
  deleteJobsByIds,
  getJobDetails,
  updateJobStatus,
} from "@/actions/job.actions";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  Company,
  JobLocation,
  JobSource,
  JobStatus,
  JobTitle,
  Tag,
} from "@/models/job.model";
import Loading from "../Loading";
import { useRouter } from "next/navigation";
import MyJobsTable from "./MyJobsTable";
import MyJobsGrid from "./MyJobsGrid";
import { NoteDialog } from "./NoteDialog";
import {
  useJobFilters,
  type MatchResumeOption,
} from "./jobs-container/useJobFilters";
import { useJobsList } from "./jobs-container/useJobsList";
import { downloadJobsList } from "./jobs-container/downloadJobsCsv";
import { JobsToolbar } from "./jobs-container/JobsToolbar";

type MyJobsProps = {
  statuses: JobStatus[];
  companies: Company[];
  titles: JobTitle[];
  locations: JobLocation[];
  sources: JobSource[];
  tags: Tag[];
  // Location/JobSource are shared with other parts of the app (contacts,
  // education, experience, and job sources/locations created but never
  // applied to a job) so the full lists above aren't right for the filter
  // dropdown — these are pre-filtered to values actually used on a job.
  filterLocations?: JobLocation[];
  filterSources?: JobSource[];
  // Resumes recorded as the match CV on at least one job — see
  // getMatchResumesInUse. Keyed by id, since Resume has no canonical value.
  filterMatchResumes?: MatchResumeOption[];
};

function JobsContainer({
  statuses,
  companies,
  titles,
  locations,
  sources,
  tags,
  filterLocations = [],
  filterSources = [],
  filterMatchResumes = [],
}: MyJobsProps) {
  const router = useRouter();
  const [editJob, setEditJob] = useState(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteJobId, setNoteJobId] = useState("");

  const {
    queryParams,
    companyFilter,
    titleFilter,
    locationFilter,
    sourceFilter,
    matchResumeFilter,
    appliedFilter,
    companyLabel,
    titleLabel,
    locationLabel,
    sourceLabel,
    matchResumeLabel,
    clearCompanyFilter,
    clearTitleFilter,
    clearLocationFilter,
    clearSourceFilter,
    clearMatchResumeFilter,
    selectLocationFilter,
    selectSourceFilter,
    selectMatchResumeFilter,
  } = useJobFilters({
    companies,
    titles,
    locations,
    sources,
    matchResumes: filterMatchResumes,
  });

  const {
    jobs,
    viewMode,
    onChangeViewMode,
    totalJobs,
    filterKey,
    searchTerm,
    setSearchTerm,
    initialLoading,
    loadingMore,
    loadJobs,
    reloadJobs,
    onFilterChange,
    sentinelRef,
  } = useJobsList({
    companyFilter,
    appliedFilter,
    titleFilter,
    locationFilter,
    sourceFilter,
    matchResumeFilter,
  });

  const onDeleteJob = async (jobId: string) => {
    const { res, success, message } = await deleteJobById(jobId);
    if (success) {
      toastSuccess(`Job has been deleted successfully`);
    } else {
      toastError(message);
    }
    reloadJobs();
  };

  const onDeleteJobs = async (jobIds: string[]) => {
    const { success, message } = await deleteJobsByIds(jobIds);
    if (success) toastSuccess(`${jobIds.length} jobs have been deleted successfully`);
    else toastError(message);
    reloadJobs();
  };

  const onEditJob = async (jobId: string) => {
    const { job, success, message } = await getJobDetails(jobId);
    if (!success) {
      toastError(message);
      return;
    }
    setEditJob(job);
  };

  const onChangeJobStatus = async (jobId: string, jobStatus: JobStatus) => {
    const { success, message } = await updateJobStatus(jobId, jobStatus);
    if (success) {
      router.refresh();
      toastSuccess(`Job has been updated successfully`);
    } else {
      toastError(message);
    }
    reloadJobs();
  };

  const resetEditJob = () => {
    setEditJob(null);
  };

  const onAddNote = (jobId: string) => {
    setNoteJobId(jobId);
    setNoteDialogOpen(true);
  };

  // Export the current result set, not the whole table: the same filter state
  // that produced the rows on screen is posted to the CSV endpoint.
  const onDownload = () =>
    downloadJobsList({
      filter: filterKey,
      search: searchTerm || undefined,
      companyValue: companyFilter || undefined,
      titleValue: titleFilter || undefined,
      locationValue: locationFilter || undefined,
      sourceValue: sourceFilter || undefined,
      matchResumeId: matchResumeFilter || undefined,
      appliedOnly: appliedFilter || undefined,
    });

  return (
    <>
      <Card x-chunk="dashboard-06-chunk-0">
        <JobsToolbar
          jobsCount={jobs.length}
          totalJobs={totalJobs}
          initialLoading={initialLoading}
          viewMode={viewMode}
          onChangeViewMode={onChangeViewMode}
          companyLabel={companyLabel}
          onClearCompanyFilter={clearCompanyFilter}
          titleLabel={titleLabel}
          onClearTitleFilter={clearTitleFilter}
          locationLabel={locationLabel}
          onClearLocationFilter={clearLocationFilter}
          sourceLabel={sourceLabel}
          onClearSourceFilter={clearSourceFilter}
          matchResumeLabel={matchResumeLabel}
          onClearMatchResumeFilter={clearMatchResumeFilter}
          locationFilter={locationFilter}
          onLocationFilterChange={selectLocationFilter}
          sourceFilter={sourceFilter}
          onSourceFilterChange={selectSourceFilter}
          matchResumeFilter={matchResumeFilter}
          onMatchResumeFilterChange={selectMatchResumeFilter}
          onReload={() => loadJobs(1, filterKey, searchTerm || undefined)}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          filterKey={filterKey}
          onFilterChange={onFilterChange}
          onDownload={onDownload}
          statuses={statuses}
          companies={companies}
          titles={titles}
          locations={locations}
          sources={sources}
          filterLocations={filterLocations}
          filterSources={filterSources}
          filterMatchResumes={filterMatchResumes}
          tags={tags}
          editJob={editJob}
          resetEditJob={resetEditJob}
          addJobInitialOpen={queryParams.get("add-job") === "true"}
        />
        <CardContent>
          {initialLoading && <Loading />}
          {jobs.length > 0 &&
            (viewMode === "cards" ? (
              <MyJobsGrid
                jobs={jobs}
                jobStatuses={statuses}
                deleteJob={onDeleteJob}
                deleteJobs={onDeleteJobs}
                editJob={onEditJob}
                onChangeJobStatus={onChangeJobStatus}
                onAddNote={onAddNote}
              />
            ) : (
              <MyJobsTable
                jobs={jobs}
                jobStatuses={statuses}
                deleteJob={onDeleteJob}
                deleteJobs={onDeleteJobs}
                editJob={onEditJob}
                onChangeJobStatus={onChangeJobStatus}
                onAddNote={onAddNote}
              />
            ))}
          {jobs.length < totalJobs && (
            <div ref={sentinelRef} className="flex justify-center p-4">
              {loadingMore && (
                <Loader className="h-5 w-5 animate-spin text-blue-500" />
              )}
            </div>
          )}
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        jobId={noteJobId}
        onSaved={() => reloadJobs()}
      />
    </>
  );
}

export default JobsContainer;

import JobBoardsContainer from "@/components/admin/JobBoardsContainer";

export default function JobBoardsPage() {
  return (
    <div className="flex flex-col col-span-3">
      <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">
        Job Boards
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Manage the catalog of job board sites automations can search. Boards
        marked &quot;Coming soon&quot; are catalog-only until scraper support
        is built for them.
      </p>
      <JobBoardsContainer />
    </div>
  );
}

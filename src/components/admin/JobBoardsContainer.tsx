"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import type { JobBoardCatalogEntry } from "@/models/automation.model";
import JobBoardsTable from "./JobBoardsTable";
import AddJobBoard from "./AddJobBoard";
import { getJobBoardList } from "@/actions/jobBoard.actions";
import Loading from "../Loading";
import { RecordsCount } from "../RecordsCount";

function JobBoardsContainer() {
  const [jobBoards, setJobBoards] = useState<JobBoardCatalogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadJobBoards = useCallback(async () => {
    setLoading(true);
    const result = await getJobBoardList(false);
    if (result?.data) {
      setJobBoards(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => await loadJobBoards())();
  }, [loadJobBoards]);

  return (
    <div className="col-span-3">
      <Card x-chunk="dashboard-06-chunk-0">
        <ResponsiveCardHeader>
          <div className="flex items-baseline gap-2">
            <CardTitle>Job Boards</CardTitle>
            {!loading && jobBoards.length > 0 && (
              <RecordsCount count={jobBoards.length} total={jobBoards.length} label="job boards" />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
            <AddJobBoard reloadJobBoards={loadJobBoards} />
          </div>
        </ResponsiveCardHeader>
        <CardContent>
          {loading && <Loading />}
          {!loading && jobBoards.length > 0 && (
            <JobBoardsTable jobBoards={jobBoards} reloadJobBoards={loadJobBoards} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default JobBoardsContainer;

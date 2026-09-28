"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import { RecordsCount } from "../RecordsCount";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { getMatchResultList } from "@/actions/matchResult.actions";
import { MatchResult } from "@/models/matchResult.model";
import { toastError } from "@/lib/toast";
import { APP_CONSTANTS } from "@/lib/constants";
import { MatchResultsTable } from "./MatchResultsTable";

function MatchResultsContainer() {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    const { data, total, success, message } = await getMatchResultList(
      page,
      APP_CONSTANTS.RECORDS_PER_PAGE,
    );
    if (success && data) {
      setResults((prev) => (page === 1 ? data : [...prev, ...data]));
      setTotal(total);
      setPage(page);
    } else {
      toastError(message);
    }
    setLoading(false);
  }, []);

  const reload = useCallback(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <Card>
      <ResponsiveCardHeader>
        <div className="flex items-baseline gap-2">
          <CardTitle>Match Results</CardTitle>
          {!loading && total > 0 && (
            <RecordsCount count={results.length} total={total} label="results" />
          )}
        </div>
      </ResponsiveCardHeader>
      <CardContent>
        {loading && results.length === 0 && <Loading />}
        {results.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">
            No saved match results yet. Run &quot;Match with AI&quot; on a job to save one here.
          </p>
        ) : (
          <MatchResultsTable results={results} reload={reload} />
        )}
        {results.length < total && (
          <div className="flex justify-center p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => load(page + 1)}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MatchResultsContainer;

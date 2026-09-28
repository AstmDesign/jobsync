"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import { RecordsCount } from "../RecordsCount";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { getGeneratedCoverLetterList } from "@/actions/coverLetter.actions";
import { CoverLetter } from "@/models/profile.model";
import { toastError } from "@/lib/toast";
import { APP_CONSTANTS } from "@/lib/constants";
import { GeneratedCoverLettersTable } from "./GeneratedCoverLettersTable";

function GeneratedCoverLettersContainer() {
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    const { data, total, success, message } = await getGeneratedCoverLetterList(
      page,
      APP_CONSTANTS.RECORDS_PER_PAGE,
    );
    if (success && data) {
      setLetters((prev) => (page === 1 ? data : [...prev, ...data]));
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
          <CardTitle>Cover Letters</CardTitle>
          {!loading && total > 0 && (
            <RecordsCount count={letters.length} total={total} label="cover letters" />
          )}
        </div>
      </ResponsiveCardHeader>
      <CardContent>
        {loading && letters.length === 0 && <Loading />}
        {letters.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">
            No saved cover letters yet. Generate one from a job to see it here.
          </p>
        ) : (
          <GeneratedCoverLettersTable letters={letters} reload={reload} />
        )}
        {letters.length < total && (
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

export default GeneratedCoverLettersContainer;

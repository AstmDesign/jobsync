"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Company, JobLocation, JobSource, JobTitle } from "@/models/job.model";

export type MatchResumeOption = { id: string; title: string };

// Owns the URL-synced job list filters (company/title/location/source/
// matchResume/applied), their display labels, and the clear handlers.
export function useJobFilters({
  companies,
  titles,
  locations,
  sources,
  matchResumes = [],
}: {
  companies: Company[];
  titles: JobTitle[];
  locations: JobLocation[];
  sources: JobSource[];
  // Resumes keyed by id rather than a canonical value — Resume has no value
  // column, so the URL param carries the id.
  matchResumes?: MatchResumeOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryParams = useSearchParams();
  const [companyFilter, setCompanyFilter] = useState<string | null>(
    queryParams.get("company"),
  );
  const [titleFilter, setTitleFilter] = useState<string | null>(
    queryParams.get("title"),
  );
  const [locationFilter, setLocationFilter] = useState<string | null>(
    queryParams.get("location"),
  );
  const [sourceFilter, setSourceFilter] = useState<string | null>(
    queryParams.get("source"),
  );
  const [matchResumeFilter, setMatchResumeFilter] = useState<string | null>(
    queryParams.get("matchResume"),
  );
  const [appliedFilter, setAppliedFilter] = useState(
    queryParams.get("applied") === "true",
  );

  const companyLabel = companyFilter
    ? companies.find((c) => c.value === companyFilter)?.label
    : null;

  const titleLabel = titleFilter
    ? titles.find((t) => t.value === titleFilter)?.label
    : null;

  const locationLabel = locationFilter
    ? locations.find((l) => l.value === locationFilter)?.label
    : null;

  const sourceLabel = sourceFilter
    ? sources.find((s) => s.value === sourceFilter)?.label
    : null;

  const matchResumeLabel = matchResumeFilter
    ? matchResumes.find((r) => r.id === matchResumeFilter)?.title
    : null;

  const clearCompanyFilter = () => {
    setCompanyFilter(null);
    setAppliedFilter(false);
    router.push(pathname);
  };

  const clearTitleFilter = () => {
    setTitleFilter(null);
    setAppliedFilter(false);
    router.push(pathname);
  };

  const clearLocationFilter = () => {
    setLocationFilter(null);
    setAppliedFilter(false);
    router.push(pathname);
  };

  const clearSourceFilter = () => {
    setSourceFilter(null);
    setAppliedFilter(false);
    router.push(pathname);
  };

  const clearMatchResumeFilter = () => {
    setMatchResumeFilter(null);
    setAppliedFilter(false);
    router.push(pathname);
  };

  // Selecting from the toolbar dropdowns follows the same convention as the
  // clear handlers above: one filter replaces the whole query string rather
  // than merging params, since only one of company/title/location/source is
  // expected active at a time.
  const selectLocationFilter = (value: string) => {
    setLocationFilter(value);
    setAppliedFilter(false);
    router.push(`${pathname}?location=${encodeURIComponent(value)}`);
  };

  const selectSourceFilter = (value: string) => {
    setSourceFilter(value);
    setAppliedFilter(false);
    router.push(`${pathname}?source=${encodeURIComponent(value)}`);
  };

  const selectMatchResumeFilter = (value: string) => {
    setMatchResumeFilter(value);
    setAppliedFilter(false);
    router.push(`${pathname}?matchResume=${encodeURIComponent(value)}`);
  };

  useEffect(() => {
    const cp = queryParams.get("company");
    const tp = queryParams.get("title");
    const lp = queryParams.get("location");
    const sp = queryParams.get("source");
    const mr = queryParams.get("matchResume");
    const ap = queryParams.get("applied") === "true";
    setCompanyFilter(cp);
    setTitleFilter(tp);
    setLocationFilter(lp);
    setSourceFilter(sp);
    setMatchResumeFilter(mr);
    setAppliedFilter(ap);
  }, [queryParams]);

  return {
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
  };
}

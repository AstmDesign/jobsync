"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Company, JobLocation, JobSource, JobTitle } from "@/models/job.model";
import {
  buildCreatedRange,
  describeDateFilter,
  normalizeDateFilter,
  readDateFilter,
  writeDateFilter,
  type DateFilter,
} from "./dateFilter";

export type MatchResumeOption = { id: string; title: string };

// One automation, with the CV it runs against so the dropdown can group by it.
// `resume` is optional because a deleted resume leaves the relation empty.
export type AutomationOption = {
  id: string;
  name: string;
  resume?: { id: string; title: string } | null;
};

// Owns the URL-synced job list filters (company/title/location/source/
// matchResume/applied and the created year/month/day), their display labels,
// and the clear handlers.
export function useJobFilters({
  companies,
  titles,
  locations,
  sources,
  matchResumes = [],
  automations = [],
}: {
  companies: Company[];
  titles: JobTitle[];
  locations: JobLocation[];
  sources: JobSource[];
  // Resumes keyed by id rather than a canonical value — Resume has no value
  // column, so the URL param carries the id.
  matchResumes?: MatchResumeOption[];
  automations?: AutomationOption[];
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
  const [automationFilter, setAutomationFilter] = useState<string | null>(
    queryParams.get("automation"),
  );
  const [appliedFilter, setAppliedFilter] = useState(
    queryParams.get("applied") === "true",
  );
  const [dateFilter, setDateFilter] = useState<DateFilter>(() =>
    readDateFilter(queryParams),
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

  // Prefixed with the CV, since the same job title is often automated against
  // more than one resume and the bare name would be ambiguous on the chip.
  const automationLabel = (() => {
    if (!automationFilter) return null;
    const match = automations.find((a) => a.id === automationFilter);
    if (!match) return null;
    return match.resume?.title
      ? `${match.resume.title}: ${match.name}`
      : match.name;
  })();

  const dateLabel = describeDateFilter(dateFilter);
  const createdRange = buildCreatedRange(dateFilter);

  // Merges rather than replaces: the date filter has to survive a change to
  // Matched CV (and vice versa), which the previous replace-the-whole-query
  // behaviour made impossible. `applied` is still cleared explicitly by every
  // handler below, which is what the old replace did implicitly.
  const pushParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(queryParams.toString());
    params.delete("applied");
    mutate(params);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const clearCompanyFilter = () => {
    setCompanyFilter(null);
    setAppliedFilter(false);
    pushParams((p) => p.delete("company"));
  };

  const clearTitleFilter = () => {
    setTitleFilter(null);
    setAppliedFilter(false);
    pushParams((p) => p.delete("title"));
  };

  const clearLocationFilter = () => {
    setLocationFilter(null);
    setAppliedFilter(false);
    pushParams((p) => p.delete("location"));
  };

  const clearSourceFilter = () => {
    setSourceFilter(null);
    setAppliedFilter(false);
    pushParams((p) => p.delete("source"));
  };

  const clearMatchResumeFilter = () => {
    setMatchResumeFilter(null);
    setAppliedFilter(false);
    pushParams((p) => p.delete("matchResume"));
  };

  const clearAutomationFilter = () => {
    setAutomationFilter(null);
    setAppliedFilter(false);
    pushParams((p) => p.delete("automation"));
  };

  const selectAutomationFilter = (value: string) => {
    setAutomationFilter(value);
    setAppliedFilter(false);
    pushParams((p) => p.set("automation", value));
  };

  const selectLocationFilter = (value: string) => {
    setLocationFilter(value);
    setAppliedFilter(false);
    pushParams((p) => p.set("location", value));
  };

  const selectSourceFilter = (value: string) => {
    setSourceFilter(value);
    setAppliedFilter(false);
    pushParams((p) => p.set("source", value));
  };

  const selectMatchResumeFilter = (value: string) => {
    setMatchResumeFilter(value);
    setAppliedFilter(false);
    pushParams((p) => p.set("matchResume", value));
  };

  // Partial updates, so picking a month keeps the year. normalizeDateFilter
  // drops a day left stranded by a month change and clamps 31 → 28/30.
  const selectDateFilter = (patch: DateFilter) => {
    const next = normalizeDateFilter({ ...dateFilter, ...patch });
    setDateFilter(next);
    pushParams((p) => writeDateFilter(p, next));
  };

  const clearDateFilter = () => {
    setDateFilter({});
    pushParams((p) => writeDateFilter(p, {}));
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
    setAutomationFilter(queryParams.get("automation"));
    setAppliedFilter(ap);
    setDateFilter(readDateFilter(queryParams));
  }, [queryParams]);

  return {
    queryParams,
    companyFilter,
    titleFilter,
    locationFilter,
    sourceFilter,
    matchResumeFilter,
    automationFilter,
    automationLabel,
    clearAutomationFilter,
    selectAutomationFilter,
    appliedFilter,
    dateFilter,
    dateLabel,
    createdRange,
    selectDateFilter,
    clearDateFilter,
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

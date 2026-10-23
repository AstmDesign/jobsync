import { format } from "date-fns";
import { toastError, toastSuccess } from "@/lib/toast";

// Mirrors the server's JobsListFilters. Kept as its own type rather than
// imported from the action module so this client file doesn't pull in "use
// server" code.
export type JobsExportFilters = {
  filter?: string;
  search?: string;
  companyValue?: string;
  titleValue?: string;
  locationValue?: string;
  sourceValue?: string;
  matchResumeId?: string;
  appliedOnly?: boolean;
};

// "none" is the list's own sentinel for "no status filter" and is not a real
// status value, so it must not be sent to the server.
const NO_FILTER = "none";

function buildFilterSlug(filters: JobsExportFilters): string {
  const parts = [
    filters.filter && filters.filter !== NO_FILTER ? filters.filter : null,
    filters.companyValue,
    filters.titleValue,
    filters.locationValue,
    filters.sourceValue,
    // The resume id would be noise in a filename; the dropdown label isn't
    // available here, so a generic marker records that the CV filter was on.
    filters.matchResumeId ? "matched-cv" : null,
    filters.appliedOnly ? "applied" : null,
    filters.search ? "search" : null,
  ].filter(Boolean) as string[];

  if (!parts.length) return "";
  return (
    "-" +
    parts
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60)
  );
}

export async function downloadJobsList(filters: JobsExportFilters = {}) {
  try {
    const body: JobsExportFilters = {
      ...filters,
      filter: filters.filter === NO_FILTER ? undefined : filters.filter,
    };
    const res = await fetch("/api/jobs/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error("Failed to download jobs!");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobsync${buildFilterSlug(filters)}-${format(
      new Date(),
      "yyyy-MM-dd",
    )}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastSuccess("Downloaded successfully!");
  } catch (error) {
    toastError(
      error instanceof Error ? error.message : "Unknown error occurred.",
    );
  }
}

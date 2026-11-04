"use client";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  daysInMonth,
  MONTH_LABELS,
  type DateFilter,
} from "./dateFilter";

// Radix refuses an empty-string SelectItem value, so "no choice" needs a
// sentinel. It never reaches the URL — onChange maps it back to undefined.
const ANY = "any";

const toPatchValue = (raw: string): number | undefined =>
  raw === ANY ? undefined : Number.parseInt(raw, 10);

/**
 * Year / Month / Day selects for the Created date filter.
 *
 * They narrow progressively: a year on its own means the whole year, so Month
 * and Day stay disabled until the level above them is set rather than being
 * hidden — a disabled control still tells you the filter goes that deep.
 */
export function JobsDateFilter({
  years,
  value,
  onChange,
}: {
  // Years the user actually has jobs in; an empty list hides the filter.
  years: number[];
  value: DateFilter;
  // Partial patch, merged and normalized by the caller.
  onChange: (patch: DateFilter) => void;
}) {
  if (years.length === 0) return null;

  const dayCount =
    value.year && value.month ? daysInMonth(value.year, value.month) : 31;

  return (
    <div className="flex items-center gap-1">
      <Select
        value={value.year ? String(value.year) : undefined}
        onValueChange={(raw) => onChange({ year: toPatchValue(raw) })}
      >
        <SelectTrigger
          className="w-[100px] h-8"
          data-testid="job-year-filter-select"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Created year</SelectLabel>
            <SelectSeparator />
            <SelectItem value={ANY}>Any year</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        value={value.month ? String(value.month) : undefined}
        onValueChange={(raw) => onChange({ month: toPatchValue(raw) })}
        disabled={!value.year}
      >
        <SelectTrigger
          className="w-[120px] h-8"
          data-testid="job-month-filter-select"
        >
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Created month</SelectLabel>
            <SelectSeparator />
            <SelectItem value={ANY}>Any month</SelectItem>
            {MONTH_LABELS.map((label, index) => (
              <SelectItem key={label} value={String(index + 1)}>
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        value={value.day ? String(value.day) : undefined}
        onValueChange={(raw) => onChange({ day: toPatchValue(raw) })}
        disabled={!value.year || !value.month}
      >
        <SelectTrigger
          className="w-[90px] h-8"
          data-testid="job-day-filter-select"
        >
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Created day</SelectLabel>
            <SelectSeparator />
            <SelectItem value={ANY}>Any day</SelectItem>
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
              <SelectItem key={day} value={String(day)}>
                {day}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CreateAutomationInput } from "@/models/automation.schema";
import type { JobBoardCatalogEntry } from "@/models/automation.model";
import { ATS_BOARDS } from "@/models/automation.model";
import { getJobBoardList } from "@/actions/jobBoard.actions";

export function StepBasics({
  form,
}: {
  form: UseFormReturn<CreateAutomationInput>;
}) {
  // The Select lets users pick any board in ATS_BOARDS — the six with a real
  // scraper wired up (Greenhouse/Lever/Ashby by company watchlist, Indeed/
  // Glassdoor/LinkedIn by keyword search). Anything else from the catalog is
  // shown disabled as "Coming soon" so the list still reflects what's
  // manageable from the Job Boards page, without letting users submit a
  // board that can't actually run yet.
  const [comingSoonBoards, setComingSoonBoards] = useState<
    JobBoardCatalogEntry[]
  >([]);

  useEffect(() => {
    (async () => {
      const result = await getJobBoardList(true);
      if (result?.data) {
        const extra = (result.data as JobBoardCatalogEntry[]).filter(
          (board) =>
            !ATS_BOARDS.includes(board.slug as (typeof ATS_BOARDS)[number]),
        );
        setComingSoonBoards(extra);
      }
    })();
  }, []);

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Automation Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Full Stack Jobs Calgary" {...field} />
            </FormControl>
            <FormDescription>
              A descriptive name to identify this automation
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="jobBoard"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job Board</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job board" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="greenhouse">
                  Greenhouse (company boards)
                </SelectItem>
                <SelectItem value="lever">Lever (company boards)</SelectItem>
                <SelectItem value="ashby">Ashby (company boards)</SelectItem>
                <SelectItem value="indeed">Indeed (keyword search)</SelectItem>
                <SelectItem value="glassdoor">
                  Glassdoor (keyword search)
                </SelectItem>
                <SelectItem value="linkedin">
                  LinkedIn (keyword search)
                </SelectItem>
                {comingSoonBoards.map((board) => (
                  <SelectItem key={board.id} value={board.slug} disabled>
                    {board.label} (coming soon)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Track specific companies&apos; job boards. More boards can be
              added from the Job Boards page — they&apos;ll appear here as
              &quot;coming soon&quot; until scraper support is built.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

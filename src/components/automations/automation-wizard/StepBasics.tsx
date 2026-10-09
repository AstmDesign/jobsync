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
  // The Select always offers the six built-in boards with a hand-built
  // scraper (Greenhouse/Lever/Ashby by company watchlist, Indeed/Glassdoor/
  // LinkedIn by keyword search). Any other catalog board (Job Boards page)
  // is also selectable once it has isSupported=true — which happens as soon
  // as it has a websiteUrl, since the generic custom-site scraper
  // (src/lib/scraper/custom) can attempt any URL. A catalog board with no
  // URL yet still shows disabled as "coming soon".
  const [customBoards, setCustomBoards] = useState<JobBoardCatalogEntry[]>([]);
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
        setCustomBoards(extra.filter((b) => b.isSupported && b.websiteUrl));
        setComingSoonBoards(extra.filter((b) => !(b.isSupported && b.websiteUrl)));
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
                {customBoards.map((board) => (
                  <SelectItem key={board.id} value={board.slug}>
                    {board.label} (custom site)
                  </SelectItem>
                ))}
                {comingSoonBoards.map((board) => (
                  <SelectItem key={board.id} value={board.slug} disabled>
                    {board.label} (coming soon)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Track specific companies&apos; job boards, or add your own
              career-page URL from the Job Boards page — it&apos;ll show up
              here as a selectable board once it has a website URL.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

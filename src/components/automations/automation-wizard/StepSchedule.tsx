"use client";

import type { UseFormReturn } from "react-hook-form";
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
import { SCHEDULE_TIMEZONE_LABEL } from "@/lib/scraper/schedule";
import { TIME_SLOTS, parseSlotKey, slotKey } from "./wizardConfig";

export function StepSchedule({
  form,
  slotCounts,
}: {
  form: UseFormReturn<CreateAutomationInput>;
  // How many of the user's *other* automations already sit in each slot,
  // keyed by slotKey(). A slot is never blocked — the count is information,
  // not a warning, since everything in a slot runs one after another.
  slotCounts: Map<string, number>;
}) {
  return (
    <FormField
      control={form.control}
      name="scheduleHour"
      render={({ field }) => {
        // scheduleHour and scheduleMinute are two form fields but one control,
        // so the Select reads and writes the combined key.
        const minute = form.watch("scheduleMinute") ?? 0;
        const current = slotKey(field.value ?? 8, minute);

        return (
          <FormItem>
            <FormLabel>Daily Run Time ({SCHEDULE_TIMEZONE_LABEL})</FormLabel>
            <Select
              onValueChange={(val) => {
                const { hour, minute: nextMinute } = parseSlotKey(val);
                field.onChange(hour);
                form.setValue("scheduleMinute", nextMinute as 0 | 30);
                form.clearErrors("scheduleHour");
              }}
              value={current}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TIME_SLOTS.map((slot) => {
                  const count = slotCounts.get(slot.key) ?? 0;
                  return (
                    <SelectItem key={slot.key} value={slot.key}>
                      {slot.label}
                      {count > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {count} {count === 1 ? "automation" : "automations"}
                        </span>
                      )}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormDescription>
              The automation will run daily at this time in Egypt
              (Africa/Cairo), regardless of where the server is. Automations
              sharing a slot run one after another, oldest first.
            </FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

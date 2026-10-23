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
import { APP_CONSTANTS } from "@/lib/constants";
import { isResumeSelectable, type WizardResume } from "./wizardConfig";

export function StepResume({
  form,
  resumes,
}: {
  form: UseFormReturn<CreateAutomationInput>;
  resumes: WizardResume[];
}) {
  const selectableCount = resumes.filter(isResumeSelectable).length;

  return (
    <>
      <FormField
        control={form.control}
        name="resumeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Resume for Matching</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {resumes.map((resume) => {
                  const selectable = isResumeSelectable(resume);
                  return (
                    <SelectItem
                      key={resume.id}
                      value={resume.id}
                      disabled={!selectable}
                    >
                      {/* Selectable items render a bare title so the closed
                          trigger (which reuses ItemText) stays single-line. */}
                      {selectable ? (
                        resume.title
                      ) : (
                        <span className="flex flex-col items-start">
                          <span>{resume.title}</span>
                          <span className="text-xs">
                            Needs at least{" "}
                            {APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION}{" "}
                            filled sections — add content in Profile → Resumes
                          </span>
                        </span>
                      )}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormDescription>
              Jobs will be matched against this resume
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      {resumes.length === 0 && (
        <p className="text-sm text-orange-600 dark:text-orange-500">
          No resumes found. Please create a resume with enough content in your
          profile first.
        </p>
      )}
      {resumes.length > 0 && selectableCount === 0 && (
        <p className="text-sm text-orange-600 dark:text-orange-500">
          None of your resumes have enough content to match against. Matching
          reads the structured sections of a resume, not the uploaded file, so
          fill in at least{" "}
          {APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION} sections (summary,
          experience, education or skills) in Profile → Resumes first.
        </p>
      )}
    </>
  );
}

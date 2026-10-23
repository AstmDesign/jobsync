"use client";

import { useEffect, useState } from "react";
import { getAutomationsList } from "@/actions/automation.actions";
import { getResumeList } from "@/actions/profile.actions";
import type { AutomationWithResume } from "@/models/automation.model";
import {
  toWizardResumes,
  type WizardResume,
} from "../automation-wizard/wizardConfig";

// Reference data the edit wizard needs: selectable resumes and the other
// automations it checks for duplicate configurations.
export function useAutomationWizardData() {
  const [resumes, setResumes] = useState<WizardResume[]>([]);
  const [allAutomations, setAllAutomations] = useState<AutomationWithResume[]>(
    [],
  );

  useEffect(() => {
    // minSections = 0: list every resume. StepResume disables the ones
    // without enough content rather than hiding them.
    getResumeList(1, 100).then((result) => {
      if (result?.data) {
        setResumes(toWizardResumes(result.data));
      }
    });
    getAutomationsList().then((result) => {
      if (result?.data) setAllAutomations(result.data);
    });
  }, []);

  return { resumes, allAutomations };
}

import { getResumeList } from "@/actions/profile.actions";
import { AutomationContainer } from "@/components/automations/AutomationContainer";
import { toWizardResumes } from "@/components/automations/automation-wizard/wizardConfig";

export default async function AutomationsPage() {
  // Fetch every resume (minSections = 0). The wizard lists them all and
  // disables the ones that lack enough content, so the user can see why a
  // resume is unavailable instead of it silently going missing.
  const resumeResult = await getResumeList(1, 100);
  const resumes = toWizardResumes(resumeResult?.data);

  return (
    <div className="col-span-3">
      <AutomationContainer resumes={resumes} />
    </div>
  );
}

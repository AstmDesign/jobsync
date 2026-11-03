import type { AutomationWithResume } from "@/models/automation.model";

// Sentinel key for automations whose resume was deleted. A real resume id can
// never collide with it, and keeping them in a group of their own means the
// "Resume missing" warning still has somewhere to live.
export const NO_RESUME_KEY = "__no_resume__";

export type AutomationGroup = {
  key: string;
  title: string;
  automations: AutomationWithResume[];
  activeCount: number;
};

/**
 * Buckets automations by the resume they run against.
 *
 * Groups are ordered by resume title so the list is stable across reloads
 * (getAutomationsList orders by automation, not resume), with the
 * missing-resume bucket pinned last since it's an error state rather than a
 * real CV. Within a group the server's ordering is preserved.
 */
export function groupAutomationsByResume(
  automations: AutomationWithResume[],
): AutomationGroup[] {
  const groups = new Map<string, AutomationGroup>();

  for (const automation of automations) {
    const key = automation.resume?.id ?? NO_RESUME_KEY;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        title: automation.resume?.title ?? "No resume",
        automations: [],
        activeCount: 0,
      };
      groups.set(key, group);
    }
    group.automations.push(automation);
    if (automation.status === "active") group.activeCount += 1;
  }

  return [...groups.values()].sort((a, b) => {
    if (a.key === NO_RESUME_KEY) return 1;
    if (b.key === NO_RESUME_KEY) return -1;
    return a.title.localeCompare(b.title);
  });
}

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutomationList } from "@/components/automations/AutomationList";
import {
  groupAutomationsByResume,
  NO_RESUME_KEY,
} from "@/components/automations/groupAutomationsByResume";
import type { AutomationWithResume } from "@/models/automation.model";

vi.mock("@/actions/automation.actions", () => ({
  deleteAutomation: vi.fn(),
  pauseAutomation: vi.fn(),
  resumeAutomation: vi.fn(),
}));

function makeAutomation(
  overrides: Partial<AutomationWithResume> = {},
): AutomationWithResume {
  return {
    id: "auto-1",
    userId: "user-1",
    name: "Backend roles",
    jobBoard: "greenhouse",
    keywords: "",
    location: "",
    sourceConfig: JSON.stringify({
      greenhouse: { companies: [], targetTitles: [], locations: [] },
    }),
    resumeId: "resume-1",
    matchThreshold: 70,
    scheduleHour: 9,
    nextRunAt: null,
    lastRunAt: null,
    status: "active",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    resume: { id: "resume-1", title: "Backend CV" },
    ...overrides,
  } as AutomationWithResume;
}

const backend = makeAutomation();
const backendPaused = makeAutomation({
  id: "auto-2",
  name: "Backend remote",
  status: "paused",
});
const qa = makeAutomation({
  id: "auto-3",
  name: "QA roles",
  resumeId: "resume-2",
  resume: { id: "resume-2", title: "QA CV" },
});

function renderList(automations: AutomationWithResume[]) {
  return render(
    <AutomationList
      automations={automations}
      onEdit={vi.fn()}
      onRefresh={vi.fn()}
    />,
  );
}

describe("groupAutomationsByResume", () => {
  it("buckets by resume id and counts the active ones", () => {
    const groups = groupAutomationsByResume([backend, qa, backendPaused]);

    expect(groups.map((g) => g.key)).toEqual(["resume-1", "resume-2"]);
    expect(groups[0].title).toBe("Backend CV");
    expect(groups[0].automations.map((a) => a.id)).toEqual([
      "auto-1",
      "auto-2",
    ]);
    // auto-2 is paused, so only one of the two counts as active.
    expect(groups[0].activeCount).toBe(1);
    expect(groups[1].activeCount).toBe(1);
  });

  it("orders groups by resume title regardless of input order", () => {
    const groups = groupAutomationsByResume([qa, backend]);
    expect(groups.map((g) => g.title)).toEqual(["Backend CV", "QA CV"]);
  });

  it("pins automations with a deleted resume to a last group", () => {
    const orphan = makeAutomation({ id: "auto-9", resume: undefined as any });
    const groups = groupAutomationsByResume([orphan, qa]);

    expect(groups.map((g) => g.key)).toEqual(["resume-2", NO_RESUME_KEY]);
    expect(groups[1].title).toBe("No resume");
  });
});

describe("AutomationList grouping", () => {
  const user = userEvent.setup();

  it("renders one collapsed group per resume, with counts", () => {
    renderList([backend, backendPaused, qa]);

    expect(screen.getByText("Backend CV")).toBeInTheDocument();
    expect(screen.getByText("QA CV")).toBeInTheDocument();
    // Collapsed by default: the headers are there, the automations are not.
    expect(screen.queryByText("Backend roles")).not.toBeInTheDocument();
    expect(screen.queryByText("QA roles")).not.toBeInTheDocument();

    const backendHeader = screen.getByTestId("automation-group-resume-1");
    expect(backendHeader).toHaveTextContent("2");
    expect(backendHeader).toHaveTextContent("1 active");
  });

  it("reveals a group's automations when its header is clicked", async () => {
    renderList([backend, backendPaused, qa]);

    await user.click(screen.getByTestId("automation-group-resume-1"));

    expect(screen.getByText("Backend roles")).toBeInTheDocument();
    expect(screen.getByText("Backend remote")).toBeInTheDocument();
    // Opening one group leaves the others alone.
    expect(screen.queryByText("QA roles")).not.toBeInTheDocument();
  });

  it("collapses again on a second click", async () => {
    renderList([backend, qa]);

    const header = screen.getByTestId("automation-group-resume-1");
    await user.click(header);
    expect(screen.getByText("Backend roles")).toBeInTheDocument();

    await user.click(header);
    expect(screen.queryByText("Backend roles")).not.toBeInTheDocument();
  });

  it("opens the only group when there is just one resume", () => {
    renderList([backend, backendPaused]);

    // Nothing to compare against, so an all-collapsed page would just be a
    // single header over empty space.
    expect(screen.getByText("Backend roles")).toBeInTheDocument();
  });

  it("still shows the empty state when there are no automations", () => {
    renderList([]);

    expect(screen.getByText("No automations yet")).toBeInTheDocument();
  });
});

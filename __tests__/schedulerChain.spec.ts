import cron from "node-cron";
import db from "@/lib/db";
import { runAutomation } from "@/lib/scraper";
import { startScheduler, stopScheduler } from "@/lib/scheduler";

// node-cron is the only way to reach runDueAutomations: it isn't exported, so
// the tests grab the callback cron.schedule was handed and drive it directly.
vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(() => ({ stop: vi.fn() })),
    validate: vi.fn(() => true),
  },
}));

vi.mock("@/lib/db", () => ({
  default: {
    automation: { findMany: vi.fn() },
    automationRun: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/scraper", () => ({
  runAutomation: vi.fn(),
  AutomationAlreadyRunningError: class extends Error {},
}));

vi.mock("@/lib/telemetry", () => ({
  log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function makeDue(overrides: Record<string, unknown> = {}) {
  return {
    id: "auto-1",
    userId: "user-1",
    name: "First",
    jobBoard: "greenhouse",
    keywords: "",
    location: "",
    sourceConfig: null,
    resumeId: "resume-1",
    resume: { id: "resume-1", title: "CV" },
    matchThreshold: 80,
    scheduleHour: 9,
    scheduleMinute: 30,
    nextRunAt: new Date("2020-01-01"),
    lastRunAt: null,
    status: "active",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// Captured once: startScheduler is a no-op on the second call, because the
// module keeps a single ScheduledTask.
let tick: () => Promise<void>;

beforeAll(() => {
  startScheduler();
  tick = (cron.schedule as any).mock.calls[0][1];
});

afterAll(() => {
  stopScheduler();
});

describe("scheduler chain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.automationRun.findFirst as any).mockResolvedValue(null);
    (runAutomation as any).mockResolvedValue({ status: "completed", jobsSaved: 0 });
  });

  it("asks for due automations oldest first", async () => {
    (db.automation.findMany as any).mockResolvedValue([]);

    await tick();

    const args = (db.automation.findMany as any).mock.calls[0][0];
    expect(args.orderBy).toEqual({ createdAt: "asc" });
  });

  it("runs automations sharing a slot one after another", async () => {
    const order: string[] = [];
    (db.automation.findMany as any).mockResolvedValue([
      makeDue({ id: "auto-1", createdAt: new Date("2026-01-01") }),
      makeDue({ id: "auto-2", name: "Second", createdAt: new Date("2026-02-01") }),
    ]);
    (runAutomation as any).mockImplementation(async (a: { id: string }) => {
      order.push(`start:${a.id}`);
      await new Promise((r) => setTimeout(r, 5));
      order.push(`end:${a.id}`);
      return { status: "completed", jobsSaved: 0 };
    });

    await tick();

    // Serial, not concurrent: the first one finishes before the second starts.
    expect(order).toEqual([
      "start:auto-1",
      "end:auto-1",
      "start:auto-2",
      "end:auto-2",
    ]);
  });

  it("passes the stored half-hour slot through to the runner", async () => {
    (db.automation.findMany as any).mockResolvedValue([makeDue()]);

    await tick();

    expect((runAutomation as any).mock.calls[0][0]).toMatchObject({
      scheduleHour: 9,
      scheduleMinute: 30,
    });
  });

  it("skips a tick that lands while a chain is still running", async () => {
    let release: () => void = () => {};
    (db.automation.findMany as any).mockResolvedValue([makeDue()]);
    (runAutomation as any).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: "completed", jobsSaved: 0 });
        }),
    );

    const first = tick();
    // Let the first tick reach the in-flight runAutomation before ticking again.
    await new Promise((r) => setTimeout(r, 0));
    await tick();

    expect(db.automation.findMany).toHaveBeenCalledTimes(1);

    release();
    await first;
  });

  it("releases the guard after a failing tick", async () => {
    (db.automation.findMany as any).mockRejectedValueOnce(new Error("db down"));

    await tick();

    (db.automation.findMany as any).mockResolvedValue([]);
    await tick();

    expect(db.automation.findMany).toHaveBeenCalledTimes(2);
  });
});

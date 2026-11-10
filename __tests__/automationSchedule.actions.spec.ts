import { createAutomation, updateAutomation } from "@/actions/automation.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";
import { scheduleZoneParts } from "@/lib/scraper/schedule";

// nextRunAt is an instant; the slot it represents is a Cairo wall-clock
// reading. getHours() would read the host zone instead, and vitest.config.ts
// doesn't pin TZ — so always go through scheduleZoneParts here.
function cairoSlot(instant: Date) {
  const parts = scheduleZoneParts(instant);
  return { hour: parts.hour, minute: parts.minute };
}

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    automation: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    resume: {
      findFirst: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

// syncSchedulerState boots node-cron and hits the DB; stub it out.
vi.mock("@/lib/scheduler", () => ({
  syncSchedulerState: vi.fn(),
}));

const RESUME_ID = "11111111-1111-4111-8111-111111111111";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Automation",
    jobBoard: "greenhouse",
    keywords: "engineer",
    location: "New York",
    sourceConfig: {
      greenhouse: { companies: [{ name: "Anthropic", token: "anthropic" }] },
    },
    resumeId: RESUME_ID,
    matchThreshold: 80,
    scheduleHour: 8,
    scheduleMinute: 0,
    ...overrides,
  } as any;
}

// A slot used to be exclusive. It no longer is: any number of automations may
// share one, and the scheduler runs them serially, oldest first. These tests
// pin that down so the clash guard doesn't get reintroduced by accident.
describe("createAutomation shared schedule slots", () => {
  const mockUser = { id: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.automation.count as any).mockResolvedValue(1);
    (prisma.resume.findFirst as any).mockResolvedValue({
      id: RESUME_ID,
      _count: { ResumeSections: 2 },
    });
    (prisma.automation.create as any).mockResolvedValue({ id: "auto-1" });
  });

  it("creates even when another automation already sits in the slot", async () => {
    // Whatever findFirst would have returned is irrelevant now — nothing
    // queries siblings before the insert.
    (prisma.automation.findFirst as any).mockResolvedValue({ id: "other" });

    const result = await createAutomation(baseInput());

    expect(result.success).toBe(true);
    expect(prisma.automation.create).toHaveBeenCalled();
  });

  it("persists the half-hour slot it was given", async () => {
    (prisma.automation.findFirst as any).mockResolvedValue(null);

    await createAutomation(baseInput({ scheduleHour: 14, scheduleMinute: 30 }));

    const data = (prisma.automation.create as any).mock.calls[0][0].data;
    expect(data).toMatchObject({ scheduleHour: 14, scheduleMinute: 30 });
    expect(cairoSlot(data.nextRunAt)).toEqual({ hour: 14, minute: 30 });
  });

  it("defaults the minute to the top of the hour", async () => {
    (prisma.automation.findFirst as any).mockResolvedValue(null);

    const input = baseInput();
    delete input.scheduleMinute;
    await createAutomation(input);

    const data = (prisma.automation.create as any).mock.calls[0][0].data;
    expect(data.scheduleMinute).toBe(0);
  });

  it("rejects a minute off the 30-minute grid", async () => {
    (prisma.automation.findFirst as any).mockResolvedValue(null);

    const result = await createAutomation(baseInput({ scheduleMinute: 17 }));

    expect(result.success).toBe(false);
    expect(prisma.automation.create).not.toHaveBeenCalled();
  });
});

describe("updateAutomation shared schedule slots", () => {
  const mockUser = { id: "user-1" };
  const AUTO_ID = "auto-1";

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.resume.findFirst as any).mockResolvedValue({
      id: RESUME_ID,
      _count: { ResumeSections: 2 },
    });
    (prisma.automation.update as any).mockResolvedValue({ id: AUTO_ID });
    // Only one findFirst left: the ownership lookup.
    (prisma.automation.findFirst as any).mockResolvedValue({
      id: AUTO_ID,
      jobBoard: "greenhouse",
      scheduleHour: 8,
      scheduleMinute: 0,
    });
  });

  it("moves into a slot another automation already occupies", async () => {
    const result = await updateAutomation(
      AUTO_ID,
      baseInput({ scheduleHour: 9, scheduleMinute: 30 }),
    );

    expect(result.success).toBe(true);
    const data = (prisma.automation.update as any).mock.calls[0][0].data;
    expect(data).toMatchObject({ scheduleHour: 9, scheduleMinute: 30 });
    expect(cairoSlot(data.nextRunAt)).toEqual({ hour: 9, minute: 30 });
  });

  it("keeps the stored hour when only the minute moves", async () => {
    await updateAutomation(AUTO_ID, { scheduleMinute: 30 } as any);

    const data = (prisma.automation.update as any).mock.calls[0][0].data;
    expect(cairoSlot(data.nextRunAt)).toEqual({ hour: 8, minute: 30 });
  });

  it("keeps the stored minute when only the hour moves", async () => {
    (prisma.automation.findFirst as any).mockResolvedValue({
      id: AUTO_ID,
      jobBoard: "greenhouse",
      scheduleHour: 8,
      scheduleMinute: 30,
    });

    await updateAutomation(AUTO_ID, { scheduleHour: 11 } as any);

    const data = (prisma.automation.update as any).mock.calls[0][0].data;
    expect(cairoSlot(data.nextRunAt)).toEqual({ hour: 11, minute: 30 });
  });

  it("leaves nextRunAt alone when the slot didn't move", async () => {
    await updateAutomation(AUTO_ID, { name: "Renamed" } as any);

    const data = (prisma.automation.update as any).mock.calls[0][0].data;
    expect(data.nextRunAt).toBeUndefined();
  });
});

// The wizard now lists every resume and disables the unusable ones, so the
// server has to be the one that actually refuses a section-less resume —
// matching builds its prompt from ResumeSections alone.
describe("automation resume content guard", () => {
  const mockUser = { id: "user-1" };
  const AUTO_ID = "auto-1";

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.automation.count as any).mockResolvedValue(1);
    (prisma.automation.create as any).mockResolvedValue({ id: "auto-1" });
    (prisma.automation.update as any).mockResolvedValue({ id: AUTO_ID });
  });

  it("rejects a create when the resume has too few sections", async () => {
    (prisma.automation.findFirst as any).mockResolvedValue(null);
    (prisma.resume.findFirst as any).mockResolvedValue({
      id: RESUME_ID,
      _count: { ResumeSections: 1 },
    });

    const result = await createAutomation(baseInput());

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/at least 2 sections/i);
    expect(prisma.automation.create).not.toHaveBeenCalled();
  });

  it("still rejects a create when the resume isn't the user's", async () => {
    (prisma.automation.findFirst as any).mockResolvedValue(null);
    (prisma.resume.findFirst as any).mockResolvedValue(null);

    const result = await createAutomation(baseInput());

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/doesn't belong to you/i);
    expect(prisma.automation.create).not.toHaveBeenCalled();
  });

  it("rejects an update that points at a section-less resume", async () => {
    (prisma.automation.findFirst as any)
      .mockResolvedValueOnce({ id: AUTO_ID, scheduleHour: 8 })
      .mockResolvedValueOnce(null);
    (prisma.resume.findFirst as any).mockResolvedValue({
      id: RESUME_ID,
      _count: { ResumeSections: 0 },
    });

    const result = await updateAutomation(AUTO_ID, baseInput());

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/at least 2 sections/i);
    expect(prisma.automation.update).not.toHaveBeenCalled();
  });

  it("allows a resume that meets the threshold", async () => {
    (prisma.automation.findFirst as any).mockResolvedValue(null);
    (prisma.resume.findFirst as any).mockResolvedValue({
      id: RESUME_ID,
      _count: { ResumeSections: 2 },
    });

    const result = await createAutomation(baseInput());

    expect(result.success).toBe(true);
    expect(prisma.automation.create).toHaveBeenCalled();
  });
});

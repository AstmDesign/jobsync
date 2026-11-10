import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { StepSchedule } from "@/components/automations/automation-wizard/StepSchedule";
import {
  TIME_SLOTS,
  parseSlotKey,
  slotKey,
} from "@/components/automations/automation-wizard/wizardConfig";
import type { CreateAutomationInput } from "@/models/automation.schema";

// Required by Radix UI Select.
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

describe("time slot grid", () => {
  it("covers every half hour from 00:00 to 23:30", () => {
    expect(TIME_SLOTS).toHaveLength(48);
    expect(TIME_SLOTS[0]).toMatchObject({ hour: 0, minute: 0, label: "00:00" });
    expect(TIME_SLOTS[1]).toMatchObject({ hour: 0, minute: 30, label: "00:30" });
    expect(TIME_SLOTS[47]).toMatchObject({
      hour: 23,
      minute: 30,
      label: "23:30",
    });
  });

  it("round-trips a key back to the two numbers the form stores", () => {
    for (const slot of TIME_SLOTS) {
      expect(parseSlotKey(slot.key)).toEqual({
        hour: slot.hour,
        minute: slot.minute,
      });
    }
  });
});

function Harness({
  slotCounts,
  defaults,
  onValues,
}: {
  slotCounts: Map<string, number>;
  defaults?: Partial<CreateAutomationInput>;
  onValues?: (values: CreateAutomationInput) => void;
}) {
  const form = useForm<CreateAutomationInput>({
    defaultValues: {
      scheduleHour: 8,
      scheduleMinute: 0,
      ...defaults,
    } as CreateAutomationInput,
  });
  onValues?.(form.watch());
  return (
    <Form {...form}>
      <StepSchedule form={form} slotCounts={slotCounts} />
    </Form>
  );
}

describe("StepSchedule", () => {
  it("shows the stored slot as HH:MM", () => {
    render(
      <Harness
        slotCounts={new Map()}
        defaults={{ scheduleHour: 9, scheduleMinute: 30 } as any}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("09:30");
  });

  it("counts the automations already in a slot instead of blocking it", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        slotCounts={
          new Map([
            [slotKey(9, 0), 2],
            [slotKey(9, 30), 1],
          ])
        }
      />,
    );

    await user.click(screen.getByRole("combobox"));

    const nine = screen.getByRole("option", { name: /^09:00/ });
    expect(nine).toHaveTextContent("2 automations");
    // Pluralization, and — more importantly — still selectable.
    expect(
      screen.getByRole("option", { name: /^09:30/ }),
    ).toHaveTextContent("1 automation");
    expect(nine).not.toHaveAttribute("aria-disabled", "true");
  });

  it("leaves an empty slot unannotated", async () => {
    const user = userEvent.setup();
    render(<Harness slotCounts={new Map([[slotKey(9, 0), 2]])} />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: "10:00" })).toBeInTheDocument();
  });

  it("writes both halves of the slot back to the form", async () => {
    const user = userEvent.setup();
    let latest: CreateAutomationInput | undefined;
    render(
      <Harness slotCounts={new Map()} onValues={(v) => (latest = v)} />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "14:30" }));

    expect(latest).toMatchObject({ scheduleHour: 14, scheduleMinute: 30 });
  });
});

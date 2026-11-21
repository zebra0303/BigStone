import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import { getNextOccurrence, getNextValidDueDate } from "../recurringDate";

describe("recurringDate edge cases", () => {
  it("clamps monthly 31st to Feb 28 in non-leap year without overflowing to March", () => {
    const next = getNextOccurrence(
      new Date(2025, 0, 31),
      { type: "MONTHLY", monthlyDay: 31 },
      true,
    );
    expect(next).not.toBeNull();
    expect(format(next!, "yyyy-MM-dd")).toBe("2025-02-28");
  });

  it("clamps monthly 31st to Feb 29 in leap year", () => {
    const next = getNextOccurrence(
      new Date(2024, 0, 31),
      { type: "MONTHLY", monthlyDay: 31 },
      true,
    );
    expect(next).not.toBeNull();
    expect(format(next!, "yyyy-MM-dd")).toBe("2024-02-29");
  });

  it("clamps yearly Feb 29 to Feb 28 in non-leap year", () => {
    const next = getNextOccurrence(
      new Date(2024, 1, 29),
      { type: "YEARLY", yearlyMonth: 2, yearlyDay: 29 },
      true,
    );
    expect(next).not.toBeNull();
    expect(format(next!, "yyyy-MM-dd")).toBe("2025-02-28");
  });

  it("preserves past dates when recurring type is NONE", () => {
    const past = new Date(2023, 4, 10);
    const initial = getNextValidDueDate(past, { type: "NONE" });
    expect(format(initial, "yyyy-MM-dd")).toBe("2023-05-10");
  });

  it("rejects out-of-range monthlyDayOfWeek without infinite loop", () => {
    expect(
      getNextOccurrence(
        new Date(2026, 0, 1),
        { type: "MONTHLY", monthlyNthWeek: 1, monthlyDayOfWeek: -1 },
        true,
      ),
    ).toBeNull();
    expect(
      getNextOccurrence(
        new Date(2026, 0, 1),
        { type: "MONTHLY", monthlyNthWeek: 1, monthlyDayOfWeek: 7 },
        true,
      ),
    ).toBeNull();
    expect(
      getNextOccurrence(
        new Date(2026, 0, 1),
        { type: "MONTHLY", monthlyNthWeek: 0, monthlyDayOfWeek: 1 },
        true,
      ),
    ).toBeNull();
  });
});

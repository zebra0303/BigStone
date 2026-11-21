import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import { getNextOccurrence, getNextValidDueDate } from "../recurringDate";

describe("server recurringDate month-end and bounds safety", () => {
  it("clamps Jan 31 monthly recurrence to Feb 28 in non-leap year", () => {
    const next = getNextOccurrence(
      new Date(2025, 0, 31),
      { type: "MONTHLY", monthlyDay: 31 },
      true,
    );
    expect(next).not.toBeNull();
    expect(format(next!, "yyyy-MM-dd")).toBe("2025-02-28");
  });

  it("clamps Feb 29 yearly recurrence to Feb 28 in non-leap year", () => {
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
    const valid = getNextValidDueDate(past, { type: "NONE" });
    expect(format(valid, "yyyy-MM-dd")).toBe("2023-05-10");
  });

  it("returns null for invalid monthlyDayOfWeek bounds without hanging", () => {
    expect(
      getNextOccurrence(
        new Date(2026, 0, 1),
        { type: "MONTHLY", monthlyNthWeek: 1, monthlyDayOfWeek: 9 },
        true,
      ),
    ).toBeNull();
    expect(
      getNextOccurrence(
        new Date(2026, 0, 1),
        { type: "MONTHLY", monthlyNthWeek: 1, monthlyDayOfWeek: -2 },
        true,
      ),
    ).toBeNull();
  });
});

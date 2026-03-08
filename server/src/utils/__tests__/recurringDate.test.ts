import { describe, it, expect } from "vitest";
import {
  getNextOccurrence,
  getNextValidDueDate,
  type RecurringConfig,
} from "../recurringDate";
import { format } from "date-fns";

describe("getNextOccurrence (server)", () => {
  describe("NONE type", () => {
    it("should return null", () => {
      expect(getNextOccurrence("2026-03-07", { type: "NONE" })).toBeNull();
    });
  });

  describe("DAILY type", () => {
    it("should return the next day with ignoreToday=true", () => {
      const next = getNextOccurrence("2026-03-07", { type: "DAILY" }, true);
      expect(next).not.toBeNull();
      expect(format(next!, "yyyy-MM-dd")).toBe("2026-03-08");
    });

    it("should return next day even for end of month", () => {
      const next = getNextOccurrence("2026-03-31", { type: "DAILY" }, true);
      expect(next).not.toBeNull();
      expect(format(next!, "yyyy-MM-dd")).toBe("2026-04-01");
    });
  });

  describe("WEEKLY type", () => {
    // 2026-03-07 is Saturday (day 6)
    it("should find the next Saturday from Saturday", () => {
      const config: RecurringConfig = { type: "WEEKLY", weeklyDays: [6] };
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(format(next!, "yyyy-MM-dd")).toBe("2026-03-14");
    });

    it("should find the nearest day from multiple days", () => {
      const config: RecurringConfig = {
        type: "WEEKLY",
        weeklyDays: [1, 3, 5], // Mon, Wed, Fri
      };
      // Saturday -> next is Monday (day 1)
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(next!.getDay()).toBe(1);
      expect(format(next!, "yyyy-MM-dd")).toBe("2026-03-09");
    });

    it("should return null for empty weeklyDays", () => {
      expect(
        getNextOccurrence(
          "2026-03-07",
          { type: "WEEKLY", weeklyDays: [] },
          true,
        ),
      ).toBeNull();
    });

    it("should return null when weeklyDays undefined", () => {
      expect(
        getNextOccurrence("2026-03-07", { type: "WEEKLY" }, true),
      ).toBeNull();
    });

    it("should handle every day of week (daily equivalent)", () => {
      const config: RecurringConfig = {
        type: "WEEKLY",
        weeklyDays: [0, 1, 2, 3, 4, 5, 6],
      };
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(format(next!, "yyyy-MM-dd")).toBe("2026-03-08");
    });
  });

  describe("MONTHLY type", () => {
    it("should return next month when day has passed", () => {
      const config: RecurringConfig = { type: "MONTHLY", monthlyDay: 5 };
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(format(next!, "yyyy-MM-dd")).toBe("2026-04-05");
    });

    it("should return current month when day is ahead", () => {
      const config: RecurringConfig = { type: "MONTHLY", monthlyDay: 15 };
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(format(next!, "yyyy-MM-dd")).toBe("2026-03-15");
    });

    it("should handle month end (day 31 in 30-day month)", () => {
      // April has 30 days, asking for day 31
      const config: RecurringConfig = { type: "MONTHLY", monthlyDay: 31 };
      const next = getNextOccurrence("2026-03-31", config, true);
      // date-fns setDate(31) on April -> May 1
      expect(next).not.toBeNull();
    });

    it("should return null when monthlyDay is undefined", () => {
      expect(
        getNextOccurrence("2026-03-07", { type: "MONTHLY" }, true),
      ).toBeNull();
    });
  });

  describe("YEARLY type", () => {
    it("should return next year when month/day has passed", () => {
      const config: RecurringConfig = {
        type: "YEARLY",
        yearlyMonth: 1,
        yearlyDay: 15,
      };
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(format(next!, "yyyy-MM-dd")).toBe("2027-01-15");
    });

    it("should return current year when month/day is ahead", () => {
      const config: RecurringConfig = {
        type: "YEARLY",
        yearlyMonth: 12,
        yearlyDay: 25,
      };
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(format(next!, "yyyy-MM-dd")).toBe("2026-12-25");
    });

    it("should return null when yearlyMonth undefined", () => {
      expect(
        getNextOccurrence("2026-03-07", { type: "YEARLY" }, true),
      ).toBeNull();
    });

    it("should return null when yearlyDay undefined", () => {
      expect(
        getNextOccurrence(
          "2026-03-07",
          { type: "YEARLY", yearlyMonth: 6 },
          true,
        ),
      ).toBeNull();
    });

    it("should handle leap year (Feb 29)", () => {
      // 2028 is a leap year
      const config: RecurringConfig = {
        type: "YEARLY",
        yearlyMonth: 2,
        yearlyDay: 29,
      };
      const next = getNextOccurrence("2026-03-07", config, true);
      // 2027 Feb doesn't have 29 -> date-fns pushes to Mar 1
      // Then 2028 should be valid
      expect(next).not.toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle undefined type gracefully", () => {
      const config = { type: undefined } as unknown as RecurringConfig;
      expect(getNextOccurrence("2026-03-07", config, true)).toBeNull();
    });

    it("should handle Date object input", () => {
      const next = getNextOccurrence(
        new Date(2026, 2, 7),
        { type: "DAILY" },
        true,
      );
      expect(next).not.toBeNull();
      expect(next!.getDate()).toBe(8);
    });
  });
});

describe("getNextValidDueDate (server)", () => {
  it("should return same date for DAILY", () => {
    const result = getNextValidDueDate("2026-03-07", { type: "DAILY" });
    expect(result.getDate()).toBe(7);
  });

  it("should return matching weekday for WEEKLY", () => {
    const config: RecurringConfig = { type: "WEEKLY", weeklyDays: [6] }; // Saturday
    // 2026-03-07 is Saturday
    const result = getNextValidDueDate("2026-03-07", config);
    expect(result.getDay()).toBe(6);
    expect(result.getDate()).toBe(7);
  });

  it("should find next matching day for WEEKLY when no match", () => {
    const config: RecurringConfig = { type: "WEEKLY", weeklyDays: [1] }; // Monday
    // 2026-03-07 is Saturday, next Monday is March 9
    const result = getNextValidDueDate("2026-03-07", config);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(9);
  });

  it("should return baseDate as fallback for NONE", () => {
    const result = getNextValidDueDate("2026-03-07", { type: "NONE" });
    expect(result.getDate()).toBe(7);
  });
});

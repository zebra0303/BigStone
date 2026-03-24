import { describe, it, expect } from "vitest";
import {
  getNextOccurrence,
  getNextValidDueDate,
  safeParseDate,
} from "../recurringDate";
import type { RecurringConfig } from "@/entities/todo/model/types";

describe("safeParseDate", () => {
  it("should parse YYYY-MM-DD string without timezone shift", () => {
    const date = safeParseDate("2026-03-07");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2); // March = 2
    expect(date.getDate()).toBe(7);
  });

  it("should parse ISO string with T without timezone shift", () => {
    const inputStr = "2026-03-07T15:00:00.000Z";
    const expectedLocal = new Date(inputStr);
    const date = safeParseDate(inputStr);
    expect(date.getFullYear()).toBe(expectedLocal.getFullYear());
    expect(date.getMonth()).toBe(expectedLocal.getMonth());
    expect(date.getDate()).toBe(expectedLocal.getDate());
  });

  it("should parse Date object as-is", () => {
    const input = new Date(2026, 2, 7);
    const date = safeParseDate(input);
    expect(date.getTime()).toBe(input.getTime());
  });
});

describe("getNextOccurrence", () => {
  describe("NONE type", () => {
    it("should return null for non-recurring tasks", () => {
      const config: RecurringConfig = { type: "NONE" };
      expect(getNextOccurrence("2026-03-07", config)).toBeNull();
    });
  });

  describe("DAILY type", () => {
    it("should return the next day", () => {
      const config: RecurringConfig = { type: "DAILY" };
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(next).not.toBeNull();
      expect(next!.getDate()).toBe(8);
    });
  });

  describe("WEEKLY type", () => {
    it("should return the next matching weekday (Saturday=6)", () => {
      const config: RecurringConfig = {
        type: "WEEKLY",
        weeklyDays: [6], // Saturday
      };
      // 2026-03-07 is a Saturday
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(next).not.toBeNull();
      expect(next!.getDay()).toBe(6); // Saturday
      expect(next!.getDate()).toBe(14); // Next Saturday
    });

    it("should return the nearest matching day from multiple days", () => {
      const config: RecurringConfig = {
        type: "WEEKLY",
        weeklyDays: [1, 3, 5], // Mon, Wed, Fri
      };
      // 2026-03-07 is Saturday, next day is Sunday, then Monday
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(next).not.toBeNull();
      expect(next!.getDay()).toBe(1); // Monday
      expect(next!.getDate()).toBe(9);
    });

    it("should return null when weeklyDays is empty", () => {
      const config: RecurringConfig = {
        type: "WEEKLY",
        weeklyDays: [],
      };
      expect(getNextOccurrence("2026-03-07", config, true)).toBeNull();
    });

    it("should return null when weeklyDays is undefined", () => {
      const config: RecurringConfig = { type: "WEEKLY" };
      expect(getNextOccurrence("2026-03-07", config, true)).toBeNull();
    });
  });

  describe("MONTHLY type", () => {
    it("should return the next month if monthlyDay has passed", () => {
      const config: RecurringConfig = {
        type: "MONTHLY",
        monthlyDay: 5,
      };
      // 2026-03-07, day 5 already passed -> next is April 5
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(next).not.toBeNull();
      expect(next!.getMonth()).toBe(3); // April
      expect(next!.getDate()).toBe(5);
    });

    it("should return later this month if monthlyDay has not passed", () => {
      const config: RecurringConfig = {
        type: "MONTHLY",
        monthlyDay: 15,
      };
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(next).not.toBeNull();
      expect(next!.getMonth()).toBe(2); // March
      expect(next!.getDate()).toBe(15);
    });

    it("should return null if no specific config is set", () => {
      const config: RecurringConfig = { type: "MONTHLY" };
      expect(getNextOccurrence("2026-03-07", config, true)).toBeNull();
    });
  });

  describe("MONTHLY nth week pattern", () => {
    it("should return next occurrence within the same month", () => {
      const config: RecurringConfig = {
        type: "MONTHLY",
        monthlyNthWeek: 3,
        monthlyDayOfWeek: 3, // 3rd Wednesday
      };
      const next = getNextOccurrence("2026-03-01", config, true);
      expect(next).not.toBeNull();
      expect(next!.getMonth()).toBe(2);
      expect(next!.getDate()).toBe(18); // 2026-03-18
    });

    it("should return next occurrence in the next month if passed", () => {
      const config: RecurringConfig = {
        type: "MONTHLY",
        monthlyNthWeek: 1,
        monthlyDayOfWeek: 1, // 1st Monday
      };
      const next = getNextOccurrence("2026-03-03", config, true);
      expect(next).not.toBeNull();
      expect(next!.getMonth()).toBe(3); // April
      expect(next!.getDate()).toBe(6); // 2026-04-06
    });
  });

  describe("YEARLY type", () => {
    it("should return next year if yearlyMonth/Day has passed", () => {
      const config: RecurringConfig = {
        type: "YEARLY",
        yearlyMonth: 1, // January
        yearlyDay: 15,
      };
      // 2026-03-07, January already passed -> next is Jan 15. 2027
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(next).not.toBeNull();
      expect(next!.getFullYear()).toBe(2027);
      expect(next!.getMonth()).toBe(0); // January
      expect(next!.getDate()).toBe(15);
    });

    it("should return later this year if yearlyMonth/Day has not passed", () => {
      const config: RecurringConfig = {
        type: "YEARLY",
        yearlyMonth: 12, // December
        yearlyDay: 25,
      };
      const next = getNextOccurrence("2026-03-07", config, true);
      expect(next).not.toBeNull();
      expect(next!.getFullYear()).toBe(2026);
      expect(next!.getMonth()).toBe(11); // December
      expect(next!.getDate()).toBe(25);
    });

    it("should return null if no specific config is set", () => {
      const config: RecurringConfig = { type: "YEARLY" };
      expect(getNextOccurrence("2026-03-07", config, true)).toBeNull();
    });
  });

  describe("undefined type (bug regression)", () => {
    it("should return null when type is undefined (not crash)", () => {
      // Simulates the bug where recurringType was missing from SELECT query
      const config = { type: undefined } as unknown as RecurringConfig;
      const result = getNextOccurrence("2026-03-07", config, true);
      // undefined !== "NONE", so it won't short-circuit, but won't match any type either
      expect(result).toBeNull();
    });
  });
});

describe("getNextValidDueDate", () => {
  it("should return the same date for DAILY recurring", () => {
    const config: RecurringConfig = { type: "DAILY" };
    // Use a future date to avoid today-based shifting
    const result = getNextValidDueDate("2027-06-15", config);
    expect(result.getDate()).toBe(15);
  });

  it("should find the next Saturday for WEEKLY with [6]", () => {
    const config: RecurringConfig = {
      type: "WEEKLY",
      weeklyDays: [6],
    };
    // 2027-06-12 is Saturday
    const result = getNextValidDueDate("2027-06-12", config);
    expect(result.getDay()).toBe(6);
    expect(result.getDate()).toBe(12);
  });

  it("should find the next matching day if current day does not match", () => {
    const config: RecurringConfig = {
      type: "WEEKLY",
      weeklyDays: [1], // Monday
    };
    // 2027-06-12 is Saturday, next Monday is 2027-06-14
    const result = getNextValidDueDate("2027-06-12", config);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(14);
  });

  describe("MONTHLY", () => {
    it("should return the same date if it matches specific day", () => {
      const config: RecurringConfig = {
        type: "MONTHLY",
        monthlyDay: 15,
      };
      const result = getNextValidDueDate("2027-06-15", config);
      expect(result.getDate()).toBe(15);
    });

    it("should roll over to next month if specific day passed", () => {
      const config: RecurringConfig = {
        type: "MONTHLY",
        monthlyDay: 5,
      };
      const result = getNextValidDueDate("2027-06-15", config);
      expect(result.getMonth()).toBe(6); // July
      expect(result.getDate()).toBe(5);
    });

    it("should return the nth occurrence of the weekday", () => {
      const config: RecurringConfig = {
        type: "MONTHLY",
        monthlyNthWeek: 2,
        monthlyDayOfWeek: 1, // 2nd Monday
      };
      const result = getNextValidDueDate("2027-03-01", config);
      expect(result.getMonth()).toBe(2);
      expect(result.getDate()).toBe(8); // March 2027 1st is Mon, so 2nd Mon is 8th
    });

    it("should handle the last (5th) occurrence of the weekday", () => {
      const config: RecurringConfig = {
        type: "MONTHLY",
        monthlyNthWeek: 5,
        monthlyDayOfWeek: 5, // last Friday
      };
      const result = getNextValidDueDate("2027-03-01", config);
      expect(result.getMonth()).toBe(2);
      expect(result.getDate()).toBe(26); // March 2027 last Friday is 26th
    });

    it("should roll over to next month if nth weekday passed", () => {
      const config: RecurringConfig = {
        type: "MONTHLY",
        monthlyNthWeek: 1,
        monthlyDayOfWeek: 1, // 1st Monday
      };
      const result = getNextValidDueDate("2027-03-03", config); // 1st Mon is Mar 1st
      expect(result.getMonth()).toBe(3); // April
      expect(result.getDate()).toBe(5); // April 2027 1st Mon is 5th
    });
  });

  describe("YEARLY", () => {
    it("should return the same date if it has not passed", () => {
      const config: RecurringConfig = {
        type: "YEARLY",
        yearlyMonth: 12,
        yearlyDay: 25,
      };
      const result = getNextValidDueDate("2027-11-01", config);
      expect(result.getFullYear()).toBe(2027);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(25);
    });

    it("should roll over to next year if date has passed", () => {
      const config: RecurringConfig = {
        type: "YEARLY",
        yearlyMonth: 1,
        yearlyDay: 1,
      };
      const result = getNextValidDueDate("2027-02-01", config);
      expect(result.getFullYear()).toBe(2028);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });
  });
});

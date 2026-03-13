import {
  addMonths,
  setDate,
  getDay,
  addDays,
  startOfDay,
  addYears,
  setMonth,
  subDays,
} from "date-fns";
import type { RecurringConfig } from "@/entities/todo/model/types";

export function safeParseDate(input: Date | string): Date {
  if (input instanceof Date) return startOfDay(input);
  if (typeof input === "string") {
    if (input.includes("T")) {
      // ISO DateTime string (e.g., 2026-03-06T15:00:00.000Z)
      // Parse it, then extract local year/month/day to avoid timezone shifting
      const d = new Date(input);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return startOfDay(new Date(input));
}

/**
 * Find the Nth occurrence of a specific weekday in a given month.
 * nth=5 means "last" occurrence.
 */
function getNthDayOfMonth(
  year: number,
  month: number,
  nth: number,
  dayOfWeek: number,
): Date | null {
  if (nth === 5) {
    // "Last" — find last occurrence by scanning backward from month end
    let date = new Date(year, month + 1, 0); // last day of month
    while (getDay(date) !== dayOfWeek) {
      date = subDays(date, 1);
    }
    return date;
  }
  // Find first occurrence of dayOfWeek in this month
  let date = new Date(year, month, 1);
  while (getDay(date) !== dayOfWeek) {
    date = addDays(date, 1);
  }
  // Advance by (nth-1) weeks
  date = addDays(date, (nth - 1) * 7);
  // Verify still in same month
  if (date.getMonth() !== month) return null;
  return date;
}

export function getNextValidDueDate(
  baseDateInput: Date | string,
  recurring: RecurringConfig,
): Date {
  const baseDate = startOfDay(safeParseDate(baseDateInput));
  const today = startOfDay(new Date());

  // Use today as reference so the result is always the nearest future date
  const referenceDate = baseDate < today ? today : baseDate;

  if (recurring.type === "DAILY") {
    return referenceDate;
  }

  if (
    recurring.type === "WEEKLY" &&
    recurring.weeklyDays &&
    recurring.weeklyDays.length > 0
  ) {
    // Find the nearest matching weekday from today onward
    let nextDate = new Date(referenceDate);
    for (let i = 0; i < 7; i++) {
      if (recurring.weeklyDays.includes(getDay(nextDate))) {
        return nextDate;
      }
      nextDate = addDays(nextDate, 1);
    }
  }

  if (recurring.type === "MONTHLY") {
    // NTH weekday pattern (e.g., "1st Monday", "last Friday")
    if (
      recurring.monthlyNthWeek != null &&
      recurring.monthlyDayOfWeek != null
    ) {
      const thisMonth = getNthDayOfMonth(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        recurring.monthlyNthWeek,
        recurring.monthlyDayOfWeek,
      );
      if (thisMonth && thisMonth.getTime() >= referenceDate.getTime()) {
        return thisMonth;
      }
      // Try next month
      const nextMonthRef = addMonths(referenceDate, 1);
      const nextMonth = getNthDayOfMonth(
        nextMonthRef.getFullYear(),
        nextMonthRef.getMonth(),
        recurring.monthlyNthWeek,
        recurring.monthlyDayOfWeek,
      );
      return nextMonth || addMonths(referenceDate, 1);
    }

    // Specific date pattern (e.g., "3rd of every month")
    if (recurring.monthlyDay) {
      let nextDate = setDate(referenceDate, recurring.monthlyDay);
      if (nextDate.getTime() < referenceDate.getTime()) {
        nextDate = addMonths(nextDate, 1);
      }
      return nextDate;
    }
  }

  if (
    recurring.type === "YEARLY" &&
    recurring.yearlyMonth &&
    recurring.yearlyDay
  ) {
    let nextDate = setDate(
      setMonth(referenceDate, recurring.yearlyMonth - 1),
      recurring.yearlyDay,
    );
    if (nextDate.getTime() < referenceDate.getTime()) {
      nextDate = addYears(nextDate, 1);
    }
    return nextDate;
  }

  return referenceDate;
}

export function getNextOccurrence(
  baseDateInput: Date | string,
  recurring: RecurringConfig,
  ignoreToday: boolean = false,
): Date | null {
  if (recurring.type === "NONE") return null;

  const baseDate = startOfDay(safeParseDate(baseDateInput));
  const today = startOfDay(new Date());

  // We want the next occurrence strictly AFTER the current due date,
  // or strictly AFTER today if the task is overdue (unless ignoreToday is true).
  const referenceDate = !ignoreToday && baseDate < today ? today : baseDate;
  let nextDate = addDays(referenceDate, 1);

  if (recurring.type === "DAILY") {
    return nextDate;
  }

  if (recurring.type === "WEEKLY") {
    if (recurring.weeklyDays && recurring.weeklyDays.length > 0) {
      for (let i = 0; i < 7; i++) {
        if (recurring.weeklyDays.includes(getDay(nextDate))) {
          return nextDate;
        }
        nextDate = addDays(nextDate, 1);
      }
    }
    return null;
  }

  if (recurring.type === "MONTHLY") {
    // NTH weekday pattern
    if (
      recurring.monthlyNthWeek != null &&
      recurring.monthlyDayOfWeek != null
    ) {
      const thisMonth = getNthDayOfMonth(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        recurring.monthlyNthWeek,
        recurring.monthlyDayOfWeek,
      );
      if (thisMonth && thisMonth.getTime() > referenceDate.getTime()) {
        return thisMonth;
      }
      const nextMonthRef = addMonths(referenceDate, 1);
      return (
        getNthDayOfMonth(
          nextMonthRef.getFullYear(),
          nextMonthRef.getMonth(),
          recurring.monthlyNthWeek,
          recurring.monthlyDayOfWeek,
        ) || null
      );
    }

    // Specific date pattern
    if (recurring.monthlyDay) {
      nextDate = setDate(referenceDate, recurring.monthlyDay);
      if (nextDate.getTime() <= referenceDate.getTime()) {
        nextDate = addMonths(nextDate, 1);
      }
      return nextDate;
    }
    return null;
  }

  if (recurring.type === "YEARLY") {
    if (recurring.yearlyMonth && recurring.yearlyDay) {
      nextDate = setDate(
        setMonth(referenceDate, recurring.yearlyMonth - 1),
        recurring.yearlyDay,
      );
      if (nextDate.getTime() <= referenceDate.getTime()) {
        nextDate = addYears(nextDate, 1);
      }
      return nextDate;
    }
    return null;
  }

  return null;
}

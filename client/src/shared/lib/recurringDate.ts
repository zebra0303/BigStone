import {
  addMonths,
  getDay,
  getDaysInMonth,
  addDays,
  startOfDay,
  subDays,
} from "date-fns";
import type { RecurringConfig } from "@/entities/todo/model/types";

export function safeParseDate(input: Date | string): Date {
  if (input instanceof Date) return startOfDay(input);
  if (typeof input === "string") {
    if (input.includes("T")) {
      const d = new Date(input);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return startOfDay(new Date(input));
}

/** Construct a local date clamping day to the target month's actual length (avoids Feb 31 -> Mar 3 overflow). */
function createClampedDate(
  year: number,
  monthIndex: number,
  day: number,
): Date {
  const maxDay = getDaysInMonth(new Date(year, monthIndex, 1));
  const clampedDay = Math.max(1, Math.min(day, maxDay));
  return new Date(year, monthIndex, clampedDay);
}

/**
 * Find the Nth occurrence of a specific weekday in a given month.
 * nth=5 means "last" occurrence. Validates bounds to prevent infinite loops.
 */
function getNthDayOfMonth(
  year: number,
  month: number,
  nth: number,
  dayOfWeek: number,
): Date | null {
  if (
    !Number.isInteger(nth) ||
    nth < 1 ||
    nth > 5 ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    return null;
  }

  if (nth === 5) {
    let date = new Date(year, month + 1, 0);
    while (getDay(date) !== dayOfWeek) {
      date = subDays(date, 1);
    }
    return date;
  }
  let date = new Date(year, month, 1);
  while (getDay(date) !== dayOfWeek) {
    date = addDays(date, 1);
  }
  date = addDays(date, (nth - 1) * 7);
  if (date.getMonth() !== month) return null;
  return date;
}

export function getNextValidDueDate(
  baseDateInput: Date | string,
  recurring: RecurringConfig,
): Date {
  const baseDate = startOfDay(safeParseDate(baseDateInput));
  // Preserve past dates for non-recurring tasks
  if (recurring.type === "NONE") {
    return baseDate;
  }

  const today = startOfDay(new Date());
  const referenceDate = baseDate < today ? today : baseDate;

  if (recurring.type === "DAILY") {
    return referenceDate;
  }

  if (
    recurring.type === "WEEKLY" &&
    recurring.weeklyDays &&
    recurring.weeklyDays.length > 0
  ) {
    let nextDate = new Date(referenceDate);
    for (let i = 0; i < 7; i++) {
      if (recurring.weeklyDays.includes(getDay(nextDate))) {
        return nextDate;
      }
      nextDate = addDays(nextDate, 1);
    }
  }

  if (recurring.type === "MONTHLY") {
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
      const nextMonthRef = addMonths(referenceDate, 1);
      const nextMonth = getNthDayOfMonth(
        nextMonthRef.getFullYear(),
        nextMonthRef.getMonth(),
        recurring.monthlyNthWeek,
        recurring.monthlyDayOfWeek,
      );
      return nextMonth || addMonths(referenceDate, 1);
    }

    if (recurring.monthlyDay) {
      let nextDate = createClampedDate(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        recurring.monthlyDay,
      );
      if (nextDate.getTime() < referenceDate.getTime()) {
        const nextMonthRef = addMonths(
          new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
          1,
        );
        nextDate = createClampedDate(
          nextMonthRef.getFullYear(),
          nextMonthRef.getMonth(),
          recurring.monthlyDay,
        );
      }
      return nextDate;
    }
  }

  if (
    recurring.type === "YEARLY" &&
    recurring.yearlyMonth &&
    recurring.yearlyDay
  ) {
    let nextDate = createClampedDate(
      referenceDate.getFullYear(),
      recurring.yearlyMonth - 1,
      recurring.yearlyDay,
    );
    if (nextDate.getTime() < referenceDate.getTime()) {
      nextDate = createClampedDate(
        referenceDate.getFullYear() + 1,
        recurring.yearlyMonth - 1,
        recurring.yearlyDay,
      );
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

    if (recurring.monthlyDay) {
      nextDate = createClampedDate(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        recurring.monthlyDay,
      );
      if (nextDate.getTime() <= referenceDate.getTime()) {
        const nextMonthRef = addMonths(
          new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
          1,
        );
        nextDate = createClampedDate(
          nextMonthRef.getFullYear(),
          nextMonthRef.getMonth(),
          recurring.monthlyDay,
        );
      }
      return nextDate;
    }
    return null;
  }

  if (recurring.type === "YEARLY") {
    if (recurring.yearlyMonth && recurring.yearlyDay) {
      nextDate = createClampedDate(
        referenceDate.getFullYear(),
        recurring.yearlyMonth - 1,
        recurring.yearlyDay,
      );
      if (nextDate.getTime() <= referenceDate.getTime()) {
        nextDate = createClampedDate(
          referenceDate.getFullYear() + 1,
          recurring.yearlyMonth - 1,
          recurring.yearlyDay,
        );
      }
      return nextDate;
    }
    return null;
  }

  return null;
}

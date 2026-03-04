import {
  addMonths,
  setDate,
  isPast,
  getDay,
  addDays,
  startOfDay,
  addYears,
  setMonth,
} from "date-fns";
import type { RecurringConfig } from "@/entities/todo/model/types";

export function getNextValidDueDate(
  baseDateInput: Date | string,
  recurring: RecurringConfig,
): Date {
  const baseDate = startOfDay(new Date(baseDateInput));
  const today = startOfDay(new Date());

  // Use the later of baseDate or today to ensure we don't schedule in the past
  // unless baseDate is intentionally in the past and we just want to align it.
  const referenceDate = baseDate > today ? baseDate : today;

  if (recurring.type === "DAILY") {
    // If it's a daily task, it should just be due on the reference date
    return referenceDate;
  }

  if (
    recurring.type === "WEEKLY" &&
    recurring.weeklyDays &&
    recurring.weeklyDays.length > 0
  ) {
    // Find the next available day of the week
    let nextDate = new Date(referenceDate);
    for (let i = 0; i < 7; i++) {
      if (recurring.weeklyDays.includes(getDay(nextDate))) {
        return nextDate;
      }
      nextDate = addDays(nextDate, 1);
    }
  }

  if (recurring.type === "MONTHLY" && recurring.monthlyDay) {
    let nextDate = setDate(referenceDate, recurring.monthlyDay);
    if (isPast(nextDate) && nextDate.getTime() !== today.getTime()) {
      nextDate = addMonths(nextDate, 1);
    }
    return nextDate;
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
    if (isPast(nextDate) && nextDate.getTime() !== today.getTime()) {
      nextDate = addYears(nextDate, 1);
    }
    return nextDate;
  }

  // Fallback for NTH which is more complex, just align to the base date and let user manually pick
  return baseDate;
}

export function getNextOccurrence(
  baseDateInput: Date | string,
  recurring: RecurringConfig,
): Date | null {
  if (recurring.type === "NONE") return null;

  const baseDate = startOfDay(new Date(baseDateInput));
  const today = startOfDay(new Date());

  // We want the next occurrence strictly AFTER the current due date, 
  // or strictly AFTER today if the task is overdue.
  const referenceDate = baseDate > today ? baseDate : today;
  let nextDate = addDays(referenceDate, 1);

  if (recurring.type === "DAILY") {
    return nextDate;
  }

  if (
    recurring.type === "WEEKLY" &&
    recurring.weeklyDays &&
    recurring.weeklyDays.length > 0
  ) {
    for (let i = 0; i < 7; i++) {
      if (recurring.weeklyDays.includes(getDay(nextDate))) {
        return nextDate;
      }
      nextDate = addDays(nextDate, 1);
    }
  }

  if (recurring.type === "MONTHLY" && recurring.monthlyDay) {
    nextDate = setDate(referenceDate, recurring.monthlyDay);
    if (nextDate.getTime() <= referenceDate.getTime()) {
      nextDate = addMonths(nextDate, 1);
    }
    return nextDate;
  }

  if (
    recurring.type === "YEARLY" &&
    recurring.yearlyMonth &&
    recurring.yearlyDay
  ) {
    nextDate = setDate(
      setMonth(referenceDate, recurring.yearlyMonth - 1),
      recurring.yearlyDay,
    );
    if (nextDate.getTime() <= referenceDate.getTime()) {
      nextDate = addYears(nextDate, 1);
    }
    return nextDate;
  }

  // Fallbacks
  return nextDate;
}

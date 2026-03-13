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
export type RecurringType = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type RecurringEndOption = "NONE" | "DATE" | "OCCURRENCES";

export interface RecurringConfig {
  type: RecurringType;
  weeklyDays?: number[]; // 0 (Sun) to 6 (Sat)
  monthlyDay?: number; // 1 to 31 (Specific date)
  monthlyNthWeek?: number; // 1 to 4 or 5 for 'Last'
  monthlyDayOfWeek?: number; // 0 (Sun) to 6 (Sat)
  yearlyMonth?: number; // 1 to 12
  yearlyDay?: number; // 1 to 31
  startDate?: string;
  endOption?: RecurringEndOption;
  endDate?: string;
  endOccurrences?: number;
}

function safeParseDate(input: Date | string): Date {
  if (typeof input === "string" && input.includes("T") === false) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(input);
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
    // "Last" — scan backward from month end
    let date = new Date(year, month + 1, 0); // last day of month
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
    let nextDate = new Date(referenceDate);
    for (let i = 0; i < 7; i++) {
      if (recurring.weeklyDays.includes(getDay(nextDate))) {
        return nextDate;
      }
      nextDate = addDays(nextDate, 1);
    }
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

    // Specific date pattern
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

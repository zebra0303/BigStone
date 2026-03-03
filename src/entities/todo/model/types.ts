export type TodoStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type RecurringType = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurringConfig {
  type: RecurringType;
  weeklyDays?: number[]; // 0 (Sun) to 6 (Sat)
  monthlyDay?: number; // 1 to 31
  yearlyMonth?: number; // 1 to 12
  yearlyDay?: number; // 1 to 31
}

export interface TodoNotification {
  minutesBefore: number; // e.g. 10, 30, 60
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  isImportant: boolean;
  dueDate: Date;
  status: TodoStatus;
  recurring: RecurringConfig;
  notification?: TodoNotification;
  completedAt?: Date;
}

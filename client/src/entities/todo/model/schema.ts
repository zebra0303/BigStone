import { z } from "zod";

export const TodoStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
export const TodoPrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const RecurringTypeSchema = z.enum([
  "NONE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]);
export const RecurringEndOptionSchema = z.enum(["NONE", "DATE", "OCCURRENCES"]);

export const RecurringConfigSchema = z.object({
  type: RecurringTypeSchema,
  weeklyDays: z.array(z.number()).optional(),
  monthlyDay: z.number().optional(),
  monthlyNthWeek: z.number().optional(),
  monthlyDayOfWeek: z.number().optional(),
  yearlyMonth: z.number().optional(),
  yearlyDay: z.number().optional(),
  startDate: z.string().optional(),
  endOption: RecurringEndOptionSchema.optional(),
  endDate: z.string().optional(),
  endOccurrences: z.number().optional(),
  occurrenceCount: z.number().optional(),
});

export const TodoNotificationSchema = z.object({
  minutesBefore: z.number(),
});

export const TodoSlackNotificationSchema = z.object({
  enabled: z.boolean(),
  time: z.string(),
});

export const AttachmentSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  originalName: z.string(),
  filename: z.string(),
  size: z.number(),
  createdAt: z.string(),
});

export const TodoSchema = z.object({
  id: z.string(),
  groupId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  isImportant: z.boolean(), // deprecated fallback
  priority: TodoPrioritySchema.optional(),
  isPinned: z.boolean().optional(),
  isCopied: z.boolean().optional(),
  dueDate: z.coerce.date(), // handles ISO string to Date conversion natively
  status: TodoStatusSchema,
  recurring: RecurringConfigSchema,
  notification: TodoNotificationSchema.optional(),
  slackNotification: TodoSlackNotificationSchema.optional(),
  completedAt: z.coerce.date().optional().nullable(),
  isVirtual: z.boolean().optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

// Create types from Zod schemas to ensure sync
export type ZodTodo = z.infer<typeof TodoSchema>;
export type ZodRecurringConfig = z.infer<typeof RecurringConfigSchema>;
export type ZodAttachment = z.infer<typeof AttachmentSchema>;

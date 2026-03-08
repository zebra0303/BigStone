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
  weeklyDays: z.array(z.number()).optional().nullable(),
  monthlyDay: z.number().optional().nullable(),
  monthlyNthWeek: z.number().optional().nullable(),
  monthlyDayOfWeek: z.number().optional().nullable(),
  yearlyMonth: z.number().optional().nullable(),
  yearlyDay: z.number().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endOption: RecurringEndOptionSchema.optional().nullable(),
  endDate: z.string().optional().nullable(),
  endOccurrences: z.number().optional().nullable(),
  occurrenceCount: z.number().optional().nullable(),
});

export const TodoNotificationSchema = z.object({
  minutesBefore: z.number().optional().nullable(),
});

export const TodoSlackNotificationSchema = z.object({
  enabled: z.boolean().optional().nullable(),
  time: z.string().optional().nullable(),
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
  groupId: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isImportant: z.boolean(), // deprecated fallback
  priority: TodoPrioritySchema.optional().nullable(),
  isPinned: z.boolean().optional().nullable(),
  isCopied: z.boolean().optional().nullable(),
  dueDate: z.coerce.date(), // handles ISO string to Date conversion natively
  status: TodoStatusSchema,
  recurring: RecurringConfigSchema,
  notification: TodoNotificationSchema.optional().nullable(),
  slackNotification: TodoSlackNotificationSchema.optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  isVirtual: z.boolean().optional().nullable(),
  attachments: z.array(AttachmentSchema).optional().nullable(),
});

// Create types from Zod schemas to ensure sync
export type ZodTodo = z.infer<typeof TodoSchema>;
export type ZodRecurringConfig = z.infer<typeof RecurringConfigSchema>;
export type ZodAttachment = z.infer<typeof AttachmentSchema>;

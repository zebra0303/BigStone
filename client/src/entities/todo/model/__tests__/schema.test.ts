import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  TodoSchema,
  TodoStatusSchema,
  TodoPrioritySchema,
  RecurringTypeSchema,
  RecurringConfigSchema,
  AttachmentSchema,
} from "../schema";

const validTodo = {
  id: "abc-123",
  groupId: "grp-1",
  title: "Buy groceries",
  description: "Milk, eggs, bread",
  isImportant: false,
  priority: "HIGH",
  isPinned: false,
  isCopied: false,
  dueDate: "2026-03-23T00:00:00.000Z",
  status: "TODO",
  recurring: { type: "NONE" },
  notification: { minutesBefore: 10 },
  slackNotification: { enabled: true, time: "09:00" },
  completedAt: null,
  isVirtual: false,
  attachments: [],
};

describe("TodoStatusSchema", () => {
  it("accepts valid statuses", () => {
    expect(TodoStatusSchema.parse("TODO")).toBe("TODO");
    expect(TodoStatusSchema.parse("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(TodoStatusSchema.parse("DONE")).toBe("DONE");
  });

  it("rejects invalid statuses", () => {
    expect(() => TodoStatusSchema.parse("INVALID")).toThrow();
  });
});

describe("TodoPrioritySchema", () => {
  it("accepts HIGH, MEDIUM, LOW", () => {
    expect(TodoPrioritySchema.parse("HIGH")).toBe("HIGH");
    expect(TodoPrioritySchema.parse("MEDIUM")).toBe("MEDIUM");
    expect(TodoPrioritySchema.parse("LOW")).toBe("LOW");
  });

  it("rejects invalid priorities", () => {
    expect(() => TodoPrioritySchema.parse("URGENT")).toThrow();
  });
});

describe("RecurringTypeSchema", () => {
  it("accepts all recurring types", () => {
    for (const t of ["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]) {
      expect(RecurringTypeSchema.parse(t)).toBe(t);
    }
  });
});

describe("RecurringConfigSchema", () => {
  it("parses minimal config", () => {
    const result = RecurringConfigSchema.parse({ type: "NONE" });
    expect(result.type).toBe("NONE");
  });

  it("parses weekly config with days", () => {
    const result = RecurringConfigSchema.parse({
      type: "WEEKLY",
      weeklyDays: [1, 3, 5],
    });
    expect(result.weeklyDays).toEqual([1, 3, 5]);
  });

  it("parses monthly config with nth week", () => {
    const result = RecurringConfigSchema.parse({
      type: "MONTHLY",
      monthlyNthWeek: 2,
      monthlyDayOfWeek: 3,
    });
    expect(result.monthlyNthWeek).toBe(2);
    expect(result.monthlyDayOfWeek).toBe(3);
  });

  it("parses yearly config", () => {
    const result = RecurringConfigSchema.parse({
      type: "YEARLY",
      yearlyMonth: 12,
      yearlyDay: 25,
    });
    expect(result.yearlyMonth).toBe(12);
    expect(result.yearlyDay).toBe(25);
  });

  it("handles null optional fields", () => {
    const result = RecurringConfigSchema.parse({
      type: "DAILY",
      weeklyDays: null,
      endDate: null,
      endOccurrences: null,
    });
    expect(result.weeklyDays).toBeNull();
    expect(result.endDate).toBeNull();
  });
});

describe("AttachmentSchema", () => {
  it("parses valid attachment", () => {
    const att = {
      id: "att-1",
      groupId: "grp-1",
      originalName: "file.pdf",
      filename: "abc123.pdf",
      size: 1024,
      createdAt: "2026-01-01T00:00:00Z",
    };
    expect(AttachmentSchema.parse(att)).toEqual(att);
  });

  it("rejects missing fields", () => {
    expect(() => AttachmentSchema.parse({ id: "att-1" })).toThrow();
  });
});

describe("TodoSchema", () => {
  it("parses a valid todo with ISO date string coerced to Date", () => {
    const result = TodoSchema.parse(validTodo);
    expect(result.id).toBe("abc-123");
    expect(result.dueDate).toBeInstanceOf(Date);
    expect(result.status).toBe("TODO");
    expect(result.recurring.type).toBe("NONE");
  });

  it("coerces various date string formats", () => {
    const result = TodoSchema.parse({ ...validTodo, dueDate: "2026-03-23" });
    expect(result.dueDate).toBeInstanceOf(Date);
    expect(result.dueDate.getFullYear()).toBe(2026);
  });

  it("allows null for optional fields", () => {
    const result = TodoSchema.parse({
      ...validTodo,
      groupId: null,
      title: null,
      description: null,
      priority: null,
      isPinned: null,
      completedAt: null,
      attachments: null,
    });
    expect(result.groupId).toBeNull();
    expect(result.title).toBeNull();
    expect(result.completedAt).toBeNull();
  });

  it("rejects missing required fields", () => {
    expect(() => TodoSchema.parse({ id: "x" })).toThrow();
  });

  it("rejects invalid status enum", () => {
    expect(() =>
      TodoSchema.parse({ ...validTodo, status: "CANCELLED" }),
    ).toThrow();
  });

  it("parses completedAt as Date when provided", () => {
    const result = TodoSchema.parse({
      ...validTodo,
      completedAt: "2026-03-24T10:00:00Z",
    });
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it("parses array of todos", () => {
    const result = z.array(TodoSchema).parse([validTodo, validTodo]);
    expect(result).toHaveLength(2);
  });
});

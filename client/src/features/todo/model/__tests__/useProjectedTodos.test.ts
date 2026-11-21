import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { format } from "date-fns";
import { useProjectedTodos } from "../useProjectedTodos";
import type { Todo } from "@/entities/todo";

describe("useProjectedTodos edge cases", () => {
  it("continues projecting future dates even if an intermediate date was completed early", () => {
    const todos: Todo[] = [
      {
        id: "t-1",
        groupId: "g-1",
        title: "Daily Standup",
        isImportant: false,
        priority: "MEDIUM",
        dueDate: new Date(2026, 5, 1),
        status: "IN_PROGRESS",
        recurring: { type: "DAILY" },
      },
      {
        id: "t-2",
        groupId: "g-1",
        title: "Daily Standup",
        isImportant: false,
        priority: "MEDIUM",
        dueDate: new Date(2026, 5, 2),
        status: "DONE",
        completedAt: new Date(2026, 5, 1),
        recurring: { type: "DAILY" },
      },
    ];

    const displayDates = [
      new Date(2026, 5, 1),
      new Date(2026, 5, 2),
      new Date(2026, 5, 3),
    ];

    const { result } = renderHook(() => useProjectedTodos(todos, displayDates));
    const june3 = result.current.find(
      (t) => format(new Date(t.dueDate), "yyyy-MM-dd") === "2026-06-03",
    );

    expect(june3).toBeDefined();
    expect(june3?.isVirtual).toBe(true);
    // Virtual occurrence must reset status to TODO rather than inheriting IN_PROGRESS
    expect(june3?.status).toBe("TODO");
  });
});

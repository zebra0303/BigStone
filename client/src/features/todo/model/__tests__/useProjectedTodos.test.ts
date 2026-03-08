import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useProjectedTodos } from "../useProjectedTodos";
import type { Todo } from "@/entities/todo/model/types";
import { addDays, format, startOfDay } from "date-fns";

describe("useProjectedTodos", () => {
  const baseDate = startOfDay(new Date("2024-01-01T00:00:00"));

  const displayDates = [baseDate, addDays(baseDate, 1), addDays(baseDate, 2)];

  it("should return normal non-recurring todos without duplication", () => {
    const todos: Todo[] = [
      {
        id: "1",
        title: "Normal Task",
        dueDate: baseDate,
        status: "TODO",
        isImportant: false,
        recurring: { type: "NONE" },
      },
    ];

    const { result } = renderHook(() => useProjectedTodos(todos, displayDates));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe("Normal Task");
    expect(result.current[0].isVirtual).toBeUndefined();
  });

  it("should project daily recurring tasks into the future", () => {
    const todos: Todo[] = [
      {
        id: "2",
        groupId: "group-2",
        title: "Daily Task",
        dueDate: baseDate,
        status: "TODO",
        isImportant: false,
        recurring: { type: "DAILY" },
      },
    ];

    const { result } = renderHook(() => useProjectedTodos(todos, displayDates));

    // 1 original + 2 projected virtual tasks for the 3-day window
    expect(result.current).toHaveLength(3);

    const virtualTasks = result.current.filter((t) => t.isVirtual);
    expect(virtualTasks).toHaveLength(2);
    expect(format(virtualTasks[0].dueDate, "yyyy-MM-dd")).toBe("2024-01-02");
    expect(format(virtualTasks[1].dueDate, "yyyy-MM-dd")).toBe("2024-01-03");
  });

  it("should not project beyond the maximum display date", () => {
    const todos: Todo[] = [
      {
        id: "3",
        groupId: "group-3",
        title: "Daily Task",
        dueDate: baseDate,
        status: "TODO",
        isImportant: false,
        recurring: { type: "DAILY" },
      },
    ];

    // Only 1 day in view
    const singleDayView = [baseDate];
    const { result } = renderHook(() =>
      useProjectedTodos(todos, singleDayView),
    );

    // Only the original task should be present, no projections
    expect(result.current).toHaveLength(1);
    expect(result.current[0].isVirtual).toBeUndefined();
  });

  it("should respect the occurrences end condition", () => {
    const todos: Todo[] = [
      {
        id: "4",
        groupId: "group-4",
        title: "Daily Task Limit",
        dueDate: baseDate, // Occurrence 1
        status: "TODO",
        isImportant: false,
        recurring: {
          type: "DAILY",
          endOption: "OCCURRENCES",
          endOccurrences: 2, // Should only project 1 more time (2 total)
          occurrenceCount: 1,
        },
      },
    ];

    const { result } = renderHook(() => useProjectedTodos(todos, displayDates));

    // Original (1st) + 1 projected (2nd). 3rd day should be empty.
    expect(result.current).toHaveLength(2);
    expect(format(result.current[1].dueDate, "yyyy-MM-dd")).toBe("2024-01-02");
  });

  it("should filter out DONE tasks if their due date is not in the display dates", () => {
    const donePastTask: Todo = {
      id: "5",
      title: "Old Done Task",
      dueDate: addDays(baseDate, -5), // 5 days ago
      status: "DONE",
      isImportant: false,
      recurring: { type: "NONE" },
    };

    const doneCurrentTask: Todo = {
      id: "6",
      title: "Current Done Task",
      dueDate: baseDate, // Today
      status: "DONE",
      isImportant: false,
      recurring: { type: "NONE" },
    };

    const { result } = renderHook(() =>
      useProjectedTodos([donePastTask, doneCurrentTask], displayDates),
    );

    // Should only keep the DONE task that matches current display dates
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe("6");
  });
});

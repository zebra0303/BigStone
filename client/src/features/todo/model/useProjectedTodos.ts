import { useMemo } from "react";
import { format, startOfDay } from "date-fns";
import type { Todo } from "@/entities/todo/model/types";
import { safeParseDate, getNextOccurrence } from "@/shared/lib";

/**
 * Custom hook to encapsulate the complex logic of projecting virtual occurrences
 * for recurring tasks within a specific date range.
 *
 * @param todos - The raw list of Todos from the server
 * @param displayDates - The dates currently visible in the calendar view
 * @returns A new array containing the original active tasks plus projected virtual tasks
 */
export function useProjectedTodos(todos: Todo[], displayDates: Date[]) {
  return useMemo(() => {
    // 1. Filter valid tasks for the current view
    const validTodos = todos.filter((todo) => {
      // Non-done tasks should always be considered (to handle overdue cases)
      if (todo.status !== "DONE") return true;

      // Pinned tasks should always be considered (handled by their own logic)
      if (todo.isPinned) return true;

      // Done tasks are only relevant if they align with the current display range
      const dueDateStr = format(safeParseDate(todo.dueDate), "yyyy-MM-dd");
      return displayDates.some((d) => format(d, "yyyy-MM-dd") === dueDateStr);
    });

    // 2. Generate Virtual Projections for Recurring tasks
    const projected: Todo[] = [];
    const maxDateMs =
      displayDates.length > 0
        ? Math.max(...displayDates.map((d) => startOfDay(d).getTime()))
        : 0;
    const minDateMs =
      displayDates.length > 0
        ? Math.min(...displayDates.map((d) => startOfDay(d).getTime()))
        : 0;

    // Track active (non-DONE) vs DONE dates separately so completing one future occurrence early
    // does not prematurely terminate subsequent virtual projections in the series
    const activeDatesPerGroup = new Map<string, Set<string>>();
    const doneDatesPerGroup = new Map<string, Set<string>>();
    todos.forEach((todo) => {
      if (todo.groupId) {
        const targetMap =
          todo.status === "DONE" ? doneDatesPerGroup : activeDatesPerGroup;
        if (!targetMap.has(todo.groupId)) {
          targetMap.set(todo.groupId, new Set());
        }
        targetMap
          .get(todo.groupId)!
          .add(format(safeParseDate(todo.dueDate), "yyyy-MM-dd"));
      }
    });

    validTodos.forEach((todo) => {
      if (todo.status !== "DONE" && todo.recurring.type !== "NONE") {
        let currentRefDate = safeParseDate(todo.dueDate);
        let projectionCount = 0;
        let runningOccurences = todo.recurring.occurrenceCount || 1;

        // Limit iterations to prevent infinite loops (e.g., 1000 = ~3 years for daily)
        while (projectionCount < 1000) {
          const nextDate = getNextOccurrence(
            currentRefDate,
            todo.recurring,
            true,
          );
          if (!nextDate) break;

          const nextDateStr = format(nextDate, "yyyy-MM-dd");
          const nextDateMs = startOfDay(nextDate).getTime();

          // Stop if beyond calendar view
          if (nextDateMs > maxDateMs) break;

          // Enforce end conditions
          if (todo.recurring.endOption === "DATE" && todo.recurring.endDate) {
            const endLimitMs = startOfDay(
              safeParseDate(todo.recurring.endDate),
            ).getTime();
            if (nextDateMs > endLimitMs) break;
          }

          if (
            todo.recurring.endOption === "OCCURRENCES" &&
            todo.recurring.endOccurrences
          ) {
            if (runningOccurences >= todo.recurring.endOccurrences) break;
          }

          if (todo.groupId) {
            if (activeDatesPerGroup.get(todo.groupId)?.has(nextDateStr)) {
              // Another active real task exists here; let that real task continue projecting
              break;
            }
            if (doneDatesPerGroup.get(todo.groupId)?.has(nextDateStr)) {
              // Early-completed occurrence exists on this date: skip rendering virtual duplicate and keep advancing
              currentRefDate = nextDate;
              projectionCount++;
              runningOccurences++;
              continue;
            }
            if (!activeDatesPerGroup.has(todo.groupId)) {
              activeDatesPerGroup.set(todo.groupId, new Set());
            }
            activeDatesPerGroup.get(todo.groupId)!.add(nextDateStr);
          }

          // Push only if visible; reset status to TODO so IN_PROGRESS never bleeds into future virtual items
          if (nextDateMs >= minDateMs) {
            projected.push({
              ...todo,
              id: `virtual-${todo.id}-${projectionCount}`,
              dueDate: nextDate,
              status: "TODO",
              completedAt: undefined,
              isVirtual: true,
            });
          }

          currentRefDate = nextDate;
          projectionCount++;
          runningOccurences++;
        }
      }
    });

    return [...validTodos, ...projected];
  }, [todos, displayDates]);
}

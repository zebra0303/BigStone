import { startOfDay, addDays, format } from "date-fns";

const safeParseDate = (d: any) => new Date(d);
const getNextOccurrence = (date: Date, recurring: any, ignoreToday: boolean) => addDays(date, 1);

const todos = [
  {
    id: "1",
    groupId: "g1",
    status: "DONE",
    dueDate: "2026-03-04T00:00:00.000Z",
    recurring: { type: "DAILY", occurrenceCount: 2 }
  },
  {
    id: "2",
    groupId: "g1",
    status: "TODO",
    dueDate: "2026-03-05T00:00:00.000Z",
    recurring: { type: "DAILY", occurrenceCount: 2 }
  }
];

const displayDates = [
  new Date("2026-03-04T00:00:00.000Z"),
  new Date("2026-03-05T00:00:00.000Z"),
  new Date("2026-03-06T00:00:00.000Z"),
  new Date("2026-03-07T00:00:00.000Z")
];

const validTodos = todos;
const projected: any[] = [];
const maxDateMs = Math.max(...displayDates.map(d => startOfDay(d).getTime()));
const minDateMs = Math.min(...displayDates.map(d => startOfDay(d).getTime()));

const existingDatesPerGroup = new Map<string, Set<string>>();
todos.forEach((todo) => {
  if (todo.groupId) {
    if (!existingDatesPerGroup.has(todo.groupId)) {
      existingDatesPerGroup.set(todo.groupId, new Set());
    }
    existingDatesPerGroup
      .get(todo.groupId)!
      .add(format(safeParseDate(todo.dueDate), "yyyy-MM-dd"));
  }
});

validTodos.forEach((todo) => {
  if (todo.status !== "DONE" && todo.recurring.type !== "NONE") {
    let currentRefDate = safeParseDate(todo.dueDate);
    let projectionCount = 0;
    let runningOccurences = todo.recurring.occurrenceCount || 1;

    while (projectionCount < 1000) {
      const nextDate = getNextOccurrence(currentRefDate, todo.recurring, true);
      if (!nextDate) break;

      const nextDateStr = format(nextDate, "yyyy-MM-dd");
      if (
        todo.groupId &&
        existingDatesPerGroup.get(todo.groupId)?.has(nextDateStr)
      ) {
        break;
      }

      const nextDateMs = startOfDay(nextDate).getTime();

      if (nextDateMs > maxDateMs) {
        break;
      }

      if (nextDateMs >= minDateMs) {
        projected.push({
          ...todo,
          id: `virtual-${todo.id}-${projectionCount}`,
          dueDate: nextDate,
          isVirtual: true,
        });
      }

      currentRefDate = nextDate;
      projectionCount++;
      runningOccurences++;
    }
  }
});

console.log("Projected:", projected.map(p => format(p.dueDate, 'yyyy-MM-dd')));

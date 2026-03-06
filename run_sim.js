const { format, addDays, startOfDay } = require("date-fns");

// Mocking the frontend logic perfectly
const todos = [
  { id: "1", groupId: "g1", dueDate: "2026-03-04T00:00:00.000Z", status: "DONE", recurring: { type: "DAILY", occurrenceCount: 2, endOption: "DATE", endDate: "2026-03-07T00:00:00.000Z" } },
  { id: "2", groupId: "g1", dueDate: "2026-03-05T00:00:00.000Z", status: "TODO", recurring: { type: "DAILY", occurrenceCount: 2, endOption: "DATE", endDate: "2026-03-07T00:00:00.000Z" } }
];

const displayDates = [
  new Date("2026-03-04T00:00:00.000Z"),
  new Date("2026-03-05T00:00:00.000Z"),
  new Date("2026-03-06T00:00:00.000Z"),
  new Date("2026-03-07T00:00:00.000Z")
];

const safeParseDate = (d) => new Date(d);
const getNextOccurrence = (baseDate, recurring, ignoreToday) => addDays(baseDate, 1);

const validTodos = todos;
const projected = [];
const maxDateMs = Math.max(...displayDates.map(d => startOfDay(d).getTime()));
const minDateMs = Math.min(...displayDates.map(d => startOfDay(d).getTime()));

const existingDatesPerGroup = new Map();
todos.forEach((todo) => {
  if (todo.groupId) {
    if (!existingDatesPerGroup.has(todo.groupId)) {
      existingDatesPerGroup.set(todo.groupId, new Set());
    }
    existingDatesPerGroup.get(todo.groupId).add(format(safeParseDate(todo.dueDate), "yyyy-MM-dd"));
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
      if (todo.groupId && existingDatesPerGroup.get(todo.groupId)?.has(nextDateStr)) {
        break;
      }

      const nextDateMs = startOfDay(nextDate).getTime();
      if (nextDateMs > maxDateMs) break;

      if (todo.recurring.endOption === "DATE" && todo.recurring.endDate) {
        const endLimitMs = startOfDay(safeParseDate(todo.recurring.endDate)).getTime();
        if (nextDateMs > endLimitMs) break;
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

const activeTodos = [...validTodos, ...projected];

displayDates.forEach(date => {
  const dayTodos = activeTodos.filter(t => format(safeParseDate(t.dueDate), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"));
  console.log(format(date, "MM-dd"), dayTodos.map(t => `${t.id} (${t.status})`));
});

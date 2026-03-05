import { useMemo, useState } from "react";
import { useTodos } from "@/features/todo/model/hooks";
import { TodoCreate } from "@/features/todo/ui/TodoCreate";
import { TodoList } from "@/features/todo/ui/TodoList";
import { Button } from "@/shared/ui/Button";
import { format, addDays, subDays, startOfWeek, getDay, startOfDay } from "date-fns";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Archive,
} from "lucide-react";
import { Link } from "react-router-dom";
import { safeParseDate, getNextOccurrence } from "@/shared/lib/recurringDate";

type ViewMode = "1DAY" | "3DAY" | "WEEK_ALL" | "WEEK_WORK";

const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function HomePage() {
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("1DAY");
  const [baseDateStr, setBaseDateStr] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const { data: todos = [] } = useTodos();

  const baseDate = useMemo(() => {
    const [y, m, d] = baseDateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [baseDateStr]);

  // Determine the display dates based on viewMode
  const displayDates = useMemo(() => {
    const dates: Date[] = [];
    if (viewMode === "1DAY") {
      dates.push(baseDate);
    } else if (viewMode === "3DAY") {
      dates.push(baseDate);
      dates.push(addDays(baseDate, 1));
      dates.push(addDays(baseDate, 2));
    } else if (viewMode === "WEEK_ALL" || viewMode === "WEEK_WORK") {
      const start = startOfWeek(baseDate, { weekStartsOn: 0 }); // Sunday start
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const dayOfWeek = getDay(d);
        if (viewMode === "WEEK_WORK" && (dayOfWeek === 0 || dayOfWeek === 6)) {
          continue; // Skip weekends
        }
        dates.push(d);
      }
    }
    return dates;
  }, [baseDate, viewMode]);

  // Filter out archived/stale tasks AND pre-calculate virtual projections
  const activeTodos = useMemo(() => {
    const validTodos = todos.filter((todo) => {
      if (todo.status === "DONE" && todo.completedAt) {
        const compDateStr = format(safeParseDate(todo.completedAt), "yyyy-MM-dd");
        return displayDates.some(
          (d) => format(d, "yyyy-MM-dd") === compDateStr,
        );
      }
      return true;
    });

    // Generate Virtual Projections for Recurring tasks
    // If a task is not DONE and is RECURRING, we should project its future occurrences
    // up to the latest date in the current displayDates view.
    const projected: typeof validTodos = [];
    const maxDateMs = displayDates.length > 0
      ? Math.max(...displayDates.map(d => startOfDay(d).getTime()))
      : 0;

    validTodos.forEach((todo) => {
      if (todo.status !== "DONE" && todo.recurring.type !== "NONE") {
        let currentRefDate = safeParseDate(todo.dueDate);

        // Keep searching for the next occurrences until we pass the view window or hit end limits
        // We cap virtual occurrences to a reasonable small limit (e.g. 7) to prevent infinite loops
        let projectionCount = 0;
        let runningOccurences = todo.recurring.occurrenceCount || 1; // 1 is default for the DB instance itself

        while (projectionCount < 7) {
          const nextDate = getNextOccurrence(currentRefDate, todo.recurring);
          if (!nextDate) break;

          const nextDateMs = startOfDay(nextDate).getTime();

          // Stop projecting if it's beyond our current calendar view
          if (nextDateMs > maxDateMs) {
            break;
          }

          // Check End Conditions before projecting
          if (todo.recurring.endOption === "DATE" && todo.recurring.endDate) {
            const endLimitMs = startOfDay(safeParseDate(todo.recurring.endDate)).getTime();
            if (nextDateMs > endLimitMs) break;
          }

          if (todo.recurring.endOption === "OCCURRENCES" && todo.recurring.endOccurrences) {
            if (runningOccurences >= todo.recurring.endOccurrences) break;
          }

          // Generate Virtual item
          projected.push({
            ...todo,
            id: `virtual-${todo.id}-${projectionCount}`,
            dueDate: nextDate,
            isVirtual: true,
          });

          // Step forward
          currentRefDate = nextDate;
          projectionCount++;
          runningOccurences++;
        }
      }
    });

    return [...validTodos, ...projected];
  }, [todos, displayDates]);

  const getTodosForDate = (date: Date, isFirstVisibleDate: boolean) => {
    return activeTodos
      .filter((todo) => {
        // 1. If completed, show it exactly on the date it was completed.
        if (todo.status === "DONE" && todo.completedAt) {
          return format(safeParseDate(todo.completedAt), "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
        }

        // 2. Uncompleted tasks logic
        const parsedDue = safeParseDate(todo.dueDate);
        const dueDateStr = format(parsedDue, "yyyy-MM-dd");
        const dateStr = format(date, "yyyy-MM-dd");
        const dueTime = parsedDue.setHours(0, 0, 0, 0);
        const currTime = date.getTime();

        // If this is the earliest visible date in the current view, include overdue tasks
        if (isFirstVisibleDate && dueTime < currTime) {
          // Extra guard: If this is an overdue recurring task with an end condition, we should NOT show it as overdue
          // if the current timeline view (date) is fully AFTER its end condition.
          // Wait, if it's a generated `Todo` row and it's TODO, it implies it hasn't met the occurrence limit yet when it was spawned.
          // However, if it has an endDate, and the current Date being viewed is strictly AFTER the endDate,
          // then the task shouldn't keep floating forward forever.
          // But actually, it's a real Todo instance in the DB. If it's overdue, the user probably still needs to do it or delete it.
          // What if the user wants it to hide? Usually overdue tasks carry forward.
          // BUT let's respect the endDate if it's past it to avoid infinite display of stale templates.
          if (todo.recurring?.endOption === "DATE" && todo.recurring.endDate) {
            const parsedEnd = safeParseDate(todo.recurring.endDate);
            const endDateMs = parsedEnd.setHours(0, 0, 0, 0);
            if (currTime > endDateMs) {
              return false; // Stop showing it forward if we are past the end date
            }
          }

          return true;
        }

        return dueDateStr === dateStr;
      })
      .sort((a, b) => {
        if (a.isImportant && !b.isImportant) return -1;
        if (!a.isImportant && b.isImportant) return 1;
        return safeParseDate(a.dueDate).getTime() - safeParseDate(b.dueDate).getTime();
      });
  };

  const handlePrev = () => {
    if (viewMode === "1DAY")
      setBaseDateStr(format(subDays(baseDate, 1), "yyyy-MM-dd"));
    if (viewMode === "3DAY")
      setBaseDateStr(format(subDays(baseDate, 3), "yyyy-MM-dd"));
    if (viewMode === "WEEK_ALL" || viewMode === "WEEK_WORK")
      setBaseDateStr(format(subDays(baseDate, 7), "yyyy-MM-dd"));
  };

  const handleNext = () => {
    if (viewMode === "1DAY")
      setBaseDateStr(format(addDays(baseDate, 1), "yyyy-MM-dd"));
    if (viewMode === "3DAY")
      setBaseDateStr(format(addDays(baseDate, 3), "yyyy-MM-dd"));
    if (viewMode === "WEEK_ALL" || viewMode === "WEEK_WORK")
      setBaseDateStr(format(addDays(baseDate, 7), "yyyy-MM-dd"));
  };

  const handleToday = () => {
    setBaseDateStr(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/stone.png"
            alt="Big Stone Mascot"
            className="w-12 h-12 object-contain drop-shadow-sm"
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Big Stone Task Manager
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-gray-500">중요한 돌부터 담으세요.</p>
              <span className="text-gray-300">|</span>
              <Link
                to="/archive"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
              >
                <Archive className="w-4 h-4" /> 보관함 보기
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={viewMode === "1DAY" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("1DAY")}
            >
              1일
            </Button>
            <Button
              variant={viewMode === "3DAY" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("3DAY")}
            >
              3일
            </Button>
            <Button
              variant={viewMode === "WEEK_WORK" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("WEEK_WORK")}
            >
              주간(평일)
            </Button>
            <Button
              variant={viewMode === "WEEK_ALL" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("WEEK_ALL")}
            >
              주간(전체)
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center bg-white border border-gray-300 rounded-md px-2 py-1 shadow-sm hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
              <input
                type="date"
                value={baseDateStr}
                onChange={(e) => {
                  if (e.target.value) setBaseDateStr(e.target.value);
                }}
                className="w-full bg-transparent border-none text-gray-700 font-medium text-sm focus:outline-none focus:ring-0 cursor-pointer"
                aria-label="날짜 선택"
              />
            </div>

            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={handleToday}>
              오늘
            </Button>
          </div>
        </div>
      </header>

      {isCreating ? (
        <TodoCreate
          onSuccess={() => setIsCreating(false)}
          onCancel={() => setIsCreating(false)}
        />
      ) : (
        <Button
          onClick={() => setIsCreating(true)}
          className="w-full flex items-center justify-center gap-2 py-6 text-lg border-2 border-dashed border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
          variant="outline"
        >
          <Plus className="h-6 w-6" />할 일 추가하기
        </Button>
      )}

      <div
        className={`grid gap-6 ${displayDates.length > 2 ? "grid-cols-1 md:grid-cols-3" : displayDates.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
      >
        {displayDates.map((date, index) => {
          const isToday =
            format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
          const isFirst = index === 0;
          const dayTodos = getTodosForDate(date, isFirst);

          return (
            <section
              key={date.getTime()}
              className={`flex flex-col bg-white rounded-xl border ${isToday ? "border-blue-200 shadow-sm ring-1 ring-blue-100" : "border-gray-100"} p-4 md:p-5 h-full`}
            >
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <h2
                    className={`text-lg font-bold flex items-center gap-2 ${isToday ? "text-blue-700" : "text-gray-800"}`}
                  >
                    {format(date, "M월 d일")} ({DAYS_KO[getDay(date)]})
                  </h2>
                  {isToday && (
                    <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      오늘
                    </span>
                  )}
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold py-0.5 px-2 rounded-full">
                  {dayTodos.length}
                </span>
              </div>
              <div className="flex-1">
                <TodoList
                  todos={dayTodos}
                  emptyMessage={
                    isToday
                      ? "오늘 끝내야 할 일이 없습니다. 🎉"
                      : "할 일이 없습니다."
                  }
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

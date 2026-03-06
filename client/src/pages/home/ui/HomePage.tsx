import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTodos } from "@/features/todo/model/hooks";
import { TodoCreate } from "@/features/todo/ui/TodoCreate";
import { TodoList } from "@/features/todo/ui/TodoList";
import { Button } from "@/shared/ui/Button";
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  getDay,
  startOfDay,
} from "date-fns";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { safeParseDate, getNextOccurrence } from "@/shared/lib/recurringDate";
import { getDateLocale } from "@/shared/lib/localeUtils";
import { cn } from "@/shared/lib/utils";

type ViewMode = "1DAY" | "3DAY" | "WEEK_ALL" | "WEEK_WORK";

export function HomePage() {
  const { t } = useTranslation();
  const [creatingDate, setCreatingDate] = useState<string | null>(null);
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
      if (todo.status === "DONE") {
        const dueDateStr = format(safeParseDate(todo.dueDate), "yyyy-MM-dd");
        return displayDates.some((d) => format(d, "yyyy-MM-dd") === dueDateStr);
      }
      return true;
    });

    // Generate Virtual Projections for Recurring tasks
    // If a task is not DONE and is RECURRING, we should project its future occurrences
    // up to the latest date in the current displayDates view.
    const projected: typeof validTodos = [];
    const maxDateMs =
      displayDates.length > 0
        ? Math.max(...displayDates.map((d) => startOfDay(d).getTime()))
        : 0;
    const minDateMs =
      displayDates.length > 0
        ? Math.min(...displayDates.map((d) => startOfDay(d).getTime()))
        : 0;

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
        // Start projection from Math.max(dueDate, today). The backend skips missed
        // strictly sequence forward from the last true due date.
        // This ensures the visual calendar paints intermediate missed days correctly.
        let currentRefDate = safeParseDate(todo.dueDate);

        // We increase the safeguard iterator to 1000 (roughly 3 years for daily tasks)
        // so users can scroll far ahead. Memory is saved by only pushing visible dates.
        let projectionCount = 0;
        let runningOccurences = todo.recurring.occurrenceCount || 1; // 1 is default for the DB instance itself

        while (projectionCount < 1000) {
          // Pass `true` for ignoreToday so virtual projections strictly sequence forward
          // from the last computed date, rather than clustering repeatedly on `today`.
          const nextDate = getNextOccurrence(
            currentRefDate,
            todo.recurring,
            true,
          );
          if (!nextDate) break;

          const nextDateStr = format(nextDate, "yyyy-MM-dd");
          if (todo.groupId) {
            if (existingDatesPerGroup.get(todo.groupId)?.has(nextDateStr)) {
              // A real task for this date already exists in the group. Let that real task handle further projections.
              break;
            }
            // Register this date so another overlapping task in the same group doesn't project it again
            existingDatesPerGroup.get(todo.groupId)?.add(nextDateStr);
          }

          const nextDateMs = startOfDay(nextDate).getTime();

          // Stop projecting if it's beyond our current calendar view
          if (nextDateMs > maxDateMs) {
            break;
          }

          // Check End Conditions before projecting
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

          // Generate Virtual item ONLY if it's visible in the current timeline view (>= minDateMs)
          if (nextDateMs >= minDateMs) {
            projected.push({
              ...todo,
              id: `virtual-${todo.id}-${projectionCount}`,
              dueDate: nextDate,
              isVirtual: true,
            });
          }

          // Step forward
          currentRefDate = nextDate;
          projectionCount++;
          runningOccurences++;
        }
      }
    });

    return [...validTodos, ...projected];
  }, [todos, displayDates]);

  const getTodosForDate = (date: Date) => {
    return activeTodos
      .filter((todo) => {
        // Strict match on the exact date. Overdue tasks do not slide to 'today',
        // and DONE tasks stay precisely on the date they were due.
        const parsedDue = safeParseDate(todo.dueDate);
        const dueDateStr = format(parsedDue, "yyyy-MM-dd");
        const dateStr = format(date, "yyyy-MM-dd");

        // Strict match on the exact date. Overdue tasks no longer slide to 'today'
        return dueDateStr === dateStr;
      })
      .sort((a, b) => {
        // Priority sorting mapping
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };

        // Fallback for legacy data without priority
        const getPriorityScore = (todo: typeof a) => {
          if (todo.priority) return priorityOrder[todo.priority];
          if (todo.isImportant) return priorityOrder.HIGH;
          return priorityOrder.MEDIUM;
        };

        const scoreA = getPriorityScore(a);
        const scoreB = getPriorityScore(b);

        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Descending order (HIGH first)
        }

        return (
          safeParseDate(a.dueDate).getTime() -
          safeParseDate(b.dueDate).getTime()
        );
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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {t("home.title")}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-gray-500 dark:text-gray-400">
                {t("home.subtitle")}
              </p>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <Link
                to="/search"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <SearchIcon className="w-4 h-4" /> {t("common.search")}
              </Link>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <SettingsIcon className="w-4 h-4" /> {t("admin.title")}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-lg border dark:border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("1DAY")}
              className={cn(
                "whitespace-nowrap px-4 font-medium transition-all duration-200",
                viewMode === "1DAY"
                  ? "shadow-sm font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
              )}
              style={
                viewMode === "1DAY"
                  ? {
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }
                  : {}
              }
            >
              {t("home.view_1day")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("3DAY")}
              className={cn(
                "whitespace-nowrap px-4 font-medium transition-all duration-200",
                viewMode === "3DAY"
                  ? "shadow-sm font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
              )}
              style={
                viewMode === "3DAY"
                  ? {
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }
                  : {}
              }
            >
              {t("home.view_3day")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("WEEK_WORK")}
              className={cn(
                "whitespace-nowrap px-4 font-medium transition-all duration-200",
                viewMode === "WEEK_WORK"
                  ? "shadow-sm font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
              )}
              style={
                viewMode === "WEEK_WORK"
                  ? {
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }
                  : {}
              }
            >
              {t("home.view_week_work")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("WEEK_ALL")}
              className={cn(
                "whitespace-nowrap px-4 font-medium transition-all duration-200",
                viewMode === "WEEK_ALL"
                  ? "shadow-sm font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
              )}
              style={
                viewMode === "WEEK_ALL"
                  ? {
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }
                  : {}
              }
            >
              {t("home.view_week_all")}
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-nowrap">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              className="dark:bg-gray-800 dark:border-gray-700 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus-within:ring-2 focus-within:ring-primary transition-colors shrink-0">
              <input
                type="date"
                value={baseDateStr}
                onChange={(e) => {
                  if (e.target.value) setBaseDateStr(e.target.value);
                }}
                className="bg-transparent border-none text-gray-700 dark:text-gray-200 font-medium text-sm focus:outline-none focus:ring-0 cursor-pointer [color-scheme:light] dark:[color-scheme:dark] w-[110px]"
                aria-label="Select Date"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="dark:bg-gray-800 dark:border-gray-700 shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              onClick={handleToday}
              className="dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 shrink-0"
            >
              {t("common.today")}
            </Button>
          </div>
        </div>
      </header>

      {creatingDate && (
        <TodoCreate
          initialDate={creatingDate}
          onSuccess={() => setCreatingDate(null)}
          onCancel={() => setCreatingDate(null)}
        />
      )}

      <div className="grid gap-6 grid-cols-1">
        {displayDates.map((date) => {
          const isToday =
            format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
          const dayTodos = getTodosForDate(date);

          return (
            <section
              key={date.getTime()}
              className={`flex flex-col bg-white dark:bg-gray-800 rounded-xl border ${isToday ? "border-blue-200 dark:border-blue-900 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900" : "border-gray-100 dark:border-gray-700"} p-4 md:p-5 h-full`}
            >
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                  <h2
                    className={`text-lg font-bold flex items-center gap-2 ${isToday ? "text-blue-700 dark:text-blue-400" : "text-gray-800 dark:text-gray-100"}`}
                  >
                    {format(date, t("home.date_format", "MMM d'일'"), {
                      locale: getDateLocale(),
                    })}{" "}
                    ({format(date, "EEE", { locale: getDateLocale() })})
                  </h2>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold py-0.5 px-2 rounded-full">
                    {dayTodos.length}
                  </span>
                  {isToday && viewMode === "1DAY" && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      {t("common.today")}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreatingDate(format(date, "yyyy-MM-dd"))}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1 h-8 px-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">
                    {t("home.add_task_btn", "할 일 추가")}
                  </span>
                </Button>
              </div>
              <div className="flex-1">
                <TodoList
                  todos={dayTodos}
                  emptyMessage={
                    isToday ? t("home.no_tasks_today") : t("home.no_tasks")
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

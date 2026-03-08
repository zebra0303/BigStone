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
  BookOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { safeParseDate } from "@/shared/lib/recurringDate";
import { getDateLocale } from "@/shared/lib/localeUtils";
import { cn } from "@/shared/lib/utils";
import { Footer } from "@/widgets/footer";

import { useProjectedTodos } from "@/features/todo/model/useProjectedTodos";

type ViewMode = "1DAY" | "3DAY" | "WEEK_ALL" | "WEEK_WORK";

export function HomePage() {
  const { t } = useTranslation();
  const [creatingDate, setCreatingDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem("bigstone-view-mode") as ViewMode) || "1DAY",
  );
  const [baseDateStr, setBaseDateStr] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("bigstone-view-mode", mode);
  };
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

  // Use the extracted hook for virtual projections
  const activeTodos = useProjectedTodos(todos, displayDates);

  // Pinned tasks: show at top of every day from dueDate until completedAt date
  const pinnedTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (!todo.isPinned) return false;
      // Not completed → show on all dates from dueDate onward
      // Completed → show only up to completedAt date (inclusive)
      return true;
    });
  }, [todos]);

  const getTodosForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dateMs = startOfDay(date).getTime();

    // Collect pinned tasks visible on this date
    const pinnedForDate = pinnedTodos.filter((todo) => {
      const dueDateMs = startOfDay(safeParseDate(todo.dueDate)).getTime();
      if (dateMs < dueDateMs) return false; // before task start
      if (todo.status === "DONE" && todo.completedAt) {
        // Show on completedAt date but not after
        const completedDateStr = format(
          new Date(todo.completedAt),
          "yyyy-MM-dd",
        );
        return dateStr <= completedDateStr;
      }
      return true; // not done: show on all dates
    });

    // Regular (non-pinned) tasks matched by exact date
    const regularForDate = activeTodos.filter((todo) => {
      if (todo.isPinned) return false; // handled separately above
      const parsedDue = safeParseDate(todo.dueDate);
      const dueDateStr = format(parsedDue, "yyyy-MM-dd");
      return dueDateStr === dateStr;
    });

    // Sort helper
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const getPriorityScore = (todo: (typeof activeTodos)[0]) => {
      if (todo.priority) return priorityOrder[todo.priority];
      if (todo.isImportant) return priorityOrder.HIGH;
      return priorityOrder.MEDIUM;
    };

    const sortByPriority = (
      a: (typeof activeTodos)[0],
      b: (typeof activeTodos)[0],
    ) => {
      const scoreA = getPriorityScore(a);
      const scoreB = getPriorityScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (
        safeParseDate(a.dueDate).getTime() - safeParseDate(b.dueDate).getTime()
      );
    };

    // Pinned first (sorted by priority), then regular (sorted by priority)
    return [
      ...pinnedForDate.sort(sortByPriority),
      ...regularForDate.sort(sortByPriority),
    ];
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
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src="/bigxi.png"
            alt="BigXi"
            title={t("common.bigxi_title")}
            className="w-14 h-14 object-contain drop-shadow-sm shrink-0"
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-gray-100">
                {t("home.title")}
              </h1>
              <p
                className="text-sm font-bold italic"
                style={{ color: "var(--primary)" }}
              >
                {t("home.subtitle")}
              </p>
            </div>

            <nav className="flex items-center gap-3 mt-1 flex-wrap">
              <Link
                to="/search"
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:!text-primary transition-colors uppercase tracking-wider"
              >
                <SearchIcon className="w-3.5 h-3.5" />{" "}
                <span>{t("common.search")}</span>
              </Link>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <Link
                to="/retrospective"
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:!text-primary transition-colors uppercase tracking-wider"
              >
                <BookOpen className="w-3.5 h-3.5" />{" "}
                <span>{t("retro.title", "톺아보기")}</span>
              </Link>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:!text-primary transition-colors uppercase tracking-wider"
              >
                <SettingsIcon className="w-3.5 h-3.5" />{" "}
                <span>{t("admin.title")}</span>
              </Link>
            </nav>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/50 p-0.5 rounded-lg border dark:border-gray-700">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleViewModeChange("1DAY")}
              className={cn(
                "whitespace-nowrap px-3 transition-all duration-200",
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
              size="xs"
              onClick={() => handleViewModeChange("3DAY")}
              className={cn(
                "whitespace-nowrap px-3 transition-all duration-200",
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
              size="xs"
              onClick={() => handleViewModeChange("WEEK_WORK")}
              className={cn(
                "whitespace-nowrap px-3 transition-all duration-200",
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
              size="xs"
              onClick={() => handleViewModeChange("WEEK_ALL")}
              className={cn(
                "whitespace-nowrap px-3 transition-all duration-200",
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
              size="xs"
              onClick={handlePrev}
              className="dark:bg-gray-800 dark:border-gray-700 shrink-0 w-7 h-7 p-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 h-7 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus-within:ring-2 focus-within:ring-primary transition-colors shrink-0">
              <input
                type="date"
                value={baseDateStr}
                onChange={(e) => {
                  if (e.target.value) setBaseDateStr(e.target.value);
                }}
                className="bg-transparent border-none text-gray-700 dark:text-gray-200 font-medium text-xs focus:outline-none focus:ring-0 cursor-pointer [color-scheme:light] dark:[color-scheme:dark] w-[95px]"
                aria-label="Select Date"
              />
            </div>

            <Button
              variant="outline"
              size="xs"
              onClick={handleNext}
              className="dark:bg-gray-800 dark:border-gray-700 shrink-0 w-7 h-7 p-0"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="secondary"
              size="xs"
              onClick={handleToday}
              className="dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 shrink-0 px-3"
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
                    className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100"
                    style={isToday ? { color: "var(--primary)" } : {}}
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
      <Footer />
    </div>
  );
}

import { useMemo, useState } from "react";
import { useTodos } from "@/features/todo/model/hooks";
import { TodoCreate } from "@/features/todo/ui/TodoCreate";
import { TodoList } from "@/features/todo/ui/TodoList";
import { Button } from "@/shared/ui/Button";
import { format, addDays, subDays, startOfWeek, getDay } from "date-fns";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";

type ViewMode = "1DAY" | "3DAY" | "WEEK_ALL" | "WEEK_WORK";

const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function HomePage() {
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("1DAY");
  const [baseDateStr, setBaseDateStr] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const { data: todos = [] } = useTodos();

  const baseDate = useMemo(() => new Date(baseDateStr), [baseDateStr]);

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

  // Filter out archived/stale tasks
  const activeTodos = useMemo(
    () =>
      todos.filter((todo) => {
        if (todo.status === "DONE" && todo.completedAt) {
          const completedDate = new Date(todo.completedAt);
          completedDate.setHours(0, 0, 0, 0);
          // Keep done tasks only if they were completed on or after the earliest visible date,
          // or just keep them if they were completed exactly on their due date (simplified: show if completed within the view)
          // For simplicity, let's just show DONE tasks if their completedDate is within the displayDates
          return displayDates.some(
            (d) => d.getTime() === completedDate.getTime(),
          );
        }
        return true;
      }),
    [todos, displayDates],
  );

  const getTodosForDate = (date: Date, isFirstVisibleDate: boolean) => {
    return activeTodos
      .filter((todo) => {
        const dueDate = new Date(todo.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        // If this is the earliest visible date in the current view, include overdue tasks
        if (isFirstVisibleDate && dueDate.getTime() < date.getTime()) {
          return todo.status !== "DONE";
        }
        return dueDate.getTime() === date.getTime();
      })
      .sort((a, b) => {
        if (a.isImportant && !b.isImportant) return -1;
        if (!a.isImportant && b.isImportant) return 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
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
            <p className="text-gray-500 mt-1">중요한 돌부터 담으세요.</p>
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

            <div className="relative flex items-center bg-white border border-gray-300 rounded-md px-3 py-1.5 shadow-sm hover:bg-gray-50 transition-colors">
              <CalendarIcon className="h-4 w-4 text-gray-500 mr-2" />
              <span className="font-medium text-gray-700 select-none">
                {format(baseDate, "yyyy년 MM월 dd일")} (
                {DAYS_KO[getDay(baseDate)]})
              </span>
              <input
                type="date"
                value={baseDateStr}
                onChange={(e) => {
                  if (e.target.value) setBaseDateStr(e.target.value);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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

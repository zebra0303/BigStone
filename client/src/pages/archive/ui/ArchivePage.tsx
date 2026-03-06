import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTodos } from "@/features/todo/model/hooks";
import { TodoList } from "@/features/todo/ui/TodoList";
import { Button } from "@/shared/ui/Button";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import type { Todo } from "@/entities/todo/model/types";

// Helper to group tasks by YYYY년 MM월
function groupTodosByMonth(todos: Todo[]) {
  const grouped: Record<string, Todo[]> = {};

  todos.forEach((todo) => {
    // Fallback to dueDate if completedAt is missing
    const dateObj = todo.completedAt
      ? new Date(todo.completedAt)
      : new Date(todo.dueDate);
    const monthKey = format(dateObj, "yyyy년 MM월");

    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(todo);
  });

  return grouped;
}

export function ArchivePage() {
  const navigate = useNavigate();
  const { data: todos = [] } = useTodos();

  const archiveTodos = useMemo(() => {
    return todos
      .filter((todo) => todo.status === "DONE")
      .sort((a, b) => {
        const dateA = a.completedAt
          ? new Date(a.completedAt).getTime()
          : new Date(a.dueDate).getTime();
        const dateB = b.completedAt
          ? new Date(b.completedAt).getTime()
          : new Date(b.dueDate).getTime();
        return dateB - dateA; // Descending (newest first)
      });
  }, [todos]);

  const groupedTodos = useMemo(
    () => groupTodosByMonth(archiveTodos),
    [archiveTodos],
  );
  const monthKeys = Object.keys(groupedTodos).sort((a, b) =>
    b.localeCompare(a),
  ); // Reverse alphabetical for YYYY년 MM월

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <img
            src="/stone.png"
            alt="Big Stone Mascot"
            className="w-12 h-12 object-contain drop-shadow-sm opacity-80 grayscale"
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-800">
              보관함
            </h1>
            <p className="text-gray-500 mt-1">
              완료된 지난 목표들을 여기서 확인하세요.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="shrink-0 flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> 홈으로 돌아가기
        </Button>
      </header>

      {monthKeys.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">
            아직 보관된 완료 일정이 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {monthKeys.map((month) => (
            <section key={month} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800">{month}</h2>
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {groupedTodos[month].length}개 완료
                </span>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm">
                <TodoList
                  todos={groupedTodos[month]}
                  emptyMessage="기록이 없습니다."
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useTodos } from "@/features/todo/model/hooks";
import { TodoCreate } from "@/features/todo/ui/TodoCreate";
import { TodoList } from "@/features/todo/ui/TodoList";
import { Button } from "@/shared/ui/Button";
import { format } from "date-fns";
import { Plus } from "lucide-react";

export function HomePage() {
  const [isCreating, setIsCreating] = useState(false);
  const { data: todos = [] } = useTodos();

  // Parse today
  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Filter out archived tasks
  const activeTodos = useMemo(
    () =>
      todos.filter((todo) => {
        if (todo.status === "DONE" && todo.completedAt) {
          const completedDate = new Date(todo.completedAt);
          completedDate.setHours(0, 0, 0, 0);
          return completedDate.getTime() === todayDate.getTime();
        }
        return true; // Keep Todos, In Progress, and today's Done
      }),
    [todos, todayDate],
  );

  // Today's specific tasks
  const todayTodos = useMemo(
    () =>
      activeTodos
        .filter((todo) => {
          const dueDate = new Date(todo.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          // Is due today or overdue
          return dueDate.getTime() <= todayDate.getTime();
        })
        .sort((a, b) => {
          // Sort by importance then date
          if (a.isImportant && !b.isImportant) return -1;
          if (!a.isImportant && b.isImportant) return 1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }),
    [activeTodos, todayDate],
  );

  // Future scheduled Tasks
  const scheduledTodos = useMemo(
    () =>
      activeTodos
        .filter((todo) => {
          const dueDate = new Date(todo.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() > todayDate.getTime();
        })
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        ),
    [activeTodos, todayDate],
  );

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8 space-y-8">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Big Stone Task Manager
          </h1>
          <p className="text-gray-500 mt-2">중요한 돌부터 담으세요.</p>
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

      <div className="space-y-6">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              오늘의 목표 (Today)
              <span className="bg-blue-100 text-blue-700 text-xs py-0.5 px-2 rounded-full">
                {todayTodos.length}
              </span>
            </h2>
            <span className="text-sm text-gray-500">
              {format(new Date(), "yyyy년 MM월 dd일")}
            </span>
          </div>
          <TodoList
            todos={todayTodos}
            emptyMessage="오늘 끝내야 할 중요한 일이 없습니다. 🎉"
          />
        </section>

        <section className="pt-4 border-t border-gray-100">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-700 flex items-center gap-2">
              예정된 할 일 (Scheduled)
              <span className="bg-gray-100 text-gray-600 text-xs py-0.5 px-2 rounded-full">
                {scheduledTodos.length}
              </span>
            </h2>
          </div>
          <TodoList
            todos={scheduledTodos}
            emptyMessage="기한이 설정된 할 일이 없습니다."
          />
        </section>
      </div>
    </div>
  );
}

import type { Todo } from "@/entities/todo/model/types";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  emptyMessage?: string;
}

export function TodoList({
  todos,
  emptyMessage = "할 일이 없습니다.",
}: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}

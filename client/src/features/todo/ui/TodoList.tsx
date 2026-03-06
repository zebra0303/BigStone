import { useTranslation } from "react-i18next";
import type { Todo } from "@/entities/todo/model/types";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  emptyMessage?: string;
}

export function TodoList({ todos, emptyMessage }: TodoListProps) {
  const { t } = useTranslation();
  const displayMessage = emptyMessage || t("home.no_tasks");

  if (todos.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
        <p>{displayMessage}</p>
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

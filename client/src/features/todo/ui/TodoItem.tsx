import { useState } from "react";
import type { Todo } from "@/entities/todo/model/types";
import {
  useUpdateTodoStatus,
  useDeleteTodo,
} from "@/features/todo/model/hooks";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Badge } from "@/shared/ui/Badge";
import { format } from "date-fns";
import { Star, Trash2, Edit2, Repeat } from "lucide-react";
import { safeParseDate } from "@/shared/lib/recurringDate";

import { Button } from "@/shared/ui/Button";
import { TodoEditModal } from "./TodoEditModal";

interface TodoItemProps {
  todo: Todo;
}

export function TodoItem({ todo }: TodoItemProps) {
  const updateTodo = useUpdateTodoStatus();
  const deleteTodo = useDeleteTodo();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isDone = todo.status === "DONE";
  const isOverdue =
    !isDone &&
    safeParseDate(todo.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

  const handleToggle = () => {
    const newStatus = isDone ? "TODO" : "DONE";

    updateTodo.mutate({
      id: todo.id,
      updates: {
        status: newStatus,
        completedAt: newStatus === "DONE" ? new Date() : undefined,
      },
    });
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(true);
  };

  return (
    <div
      className={`relative group flex flex-col gap-2 rounded-lg border p-4 transition-all hover:bg-gray-50 bg-white 
      ${isDone ? "opacity-60" : ""} 
      ${todo.isVirtual ? "opacity-70 border-dashed bg-gray-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <Checkbox
            checked={isDone}
            onChange={handleToggle}
            className="h-5 w-5 rounded-full"
            disabled={todo.isVirtual}
          />

          <div
            className="flex flex-col gap-1 overflow-hidden cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            title={todo.isVirtual ? "이전 일정을 먼저 완료해주세요." : ""}
          >
            <div className="flex items-center gap-2">
              {todo.isImportant && (
                <Star className="h-4 w-4 fill-primary text-primary" />
              )}
              <span
                className={`font-medium truncate ${isDone ? "line-through text-gray-500" : "text-gray-900"}`}
              >
                {todo.title}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {todo.description && !isExpanded && (
                <span className="truncate max-w-[200px]">
                  {todo.description}
                </span>
              )}
              {todo.description && !isExpanded && <span>•</span>}
              <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                {format(new Date(todo.dueDate), "MMM d, yyyy")}
              </span>
              {todo.recurring.type !== "NONE" && (
                <>
                  <span>•</span>
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0.5 text-[10px] flex items-center gap-1"
                  >
                    <Repeat className="h-3 w-3" />
                    {todo.recurring.type}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm p-1 rounded-md shadow-sm border border-gray-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEditClick}
            className="h-7 w-7 text-gray-400 hover:text-blue-600 flex-shrink-0 bg-transparent hover:bg-blue-50"
            aria-label="Edit todo"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          {!todo.isVirtual && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTodo.mutate(todo.id)}
              className="h-7 w-7 text-gray-400 hover:text-red-600 flex-shrink-0 bg-transparent hover:bg-red-50"
              aria-label="Delete todo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && todo.description && (
        <div className="mt-2 pl-9 pr-8 text-sm text-gray-700 whitespace-pre-wrap">
          {todo.description}
        </div>
      )}

      {isEditModalOpen && (
        <TodoEditModal
          todo={todo}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Todo } from "@/entities/todo/model/types";
import {
  useUpdateTodoStatus,
  useDeleteTodo,
  useCompleteVirtualTodo,
} from "@/features/todo/model/hooks";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Badge } from "@/shared/ui/Badge";
import { format } from "date-fns";
import { Star, Trash2, Edit2, Repeat, Paperclip } from "lucide-react";
import { safeParseDate } from "@/shared/lib/recurringDate";
import { getDateLocale } from "@/shared/lib/localeUtils";

import { Button } from "@/shared/ui/Button";
import { TodoEditModal } from "./TodoEditModal";

import { LinkifiedText } from "@/shared/lib/linkify";

interface TodoItemProps {
  todo: Todo;
}

export function TodoItem({ todo }: TodoItemProps) {
  const { t } = useTranslation();
  const updateTodo = useUpdateTodoStatus();
  const deleteTodo = useDeleteTodo();
  const completeVirtualTodo = useCompleteVirtualTodo();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isDone = todo.status === "DONE";
  const isOverdue =
    !isDone &&
    safeParseDate(todo.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

  const handleToggle = () => {
    if (todo.isVirtual) {
      // The real ID is the base ID before the "-index" suffix
      const realId = todo.id.replace(/^virtual-/, "").replace(/-\d+$/, "");
      const targetDate = format(todo.dueDate, "yyyy-MM-dd");
      completeVirtualTodo.mutate({ id: realId, targetDate });
      return;
    }

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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const realId = todo.id.startsWith("virtual-")
      ? todo.id.replace(/^virtual-/, "").replace(/-\d+$/, "")
      : todo.id;
    deleteTodo.mutate(realId);
  };

  return (
    <>
      <div
        className={`relative group flex flex-col gap-2 rounded-lg border p-4 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800 dark:border-gray-700
        ${isDone ? "opacity-60" : ""} 
        ${todo.isVirtual ? "opacity-70 border-dashed bg-gray-50 dark:bg-gray-800/50" : ""}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            <Checkbox
              checked={isDone}
              onChange={handleToggle}
              className="h-5 w-5 rounded-full"
            />

            <div
              className="flex flex-col gap-1 overflow-hidden cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center gap-2">
                {todo.priority === "HIGH" && (
                  <Star className="h-4 w-4 fill-red-500 text-red-500 flex-shrink-0" />
                )}
                {todo.priority === "MEDIUM" && (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-500 flex-shrink-0" />
                )}
                {todo.priority === "LOW" && (
                  <Star className="h-4 w-4 fill-green-500 text-green-500 flex-shrink-0" />
                )}
                {/* Fallback for old data without priority */}
                {todo.isImportant && !todo.priority && (
                  <Star className="h-4 w-4 fill-red-500 text-red-500 flex-shrink-0" />
                )}
                <span
                  className={`font-medium truncate ${isDone ? "line-through text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"}`}
                >
                  {todo.title}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {todo.description && !isExpanded && (
                  <span className="truncate max-w-[200px]">
                    {todo.description}
                  </span>
                )}
                {todo.description && !isExpanded && <span>•</span>}
                <span
                  className={
                    isOverdue
                      ? "text-red-600 dark:text-red-400 font-semibold"
                      : ""
                  }
                >
                  {format(new Date(todo.dueDate), "MMM d, yyyy", {
                    locale: getDateLocale(),
                  })}
                </span>
                {todo.recurring.type !== "NONE" && (
                  <>
                    <span>•</span>
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0.5 text-[10px] flex items-center gap-1 dark:bg-gray-700 dark:text-gray-300"
                    >
                      <Repeat className="h-3 w-3" />
                      {t(`task.repeat_${todo.recurring.type.toLowerCase()}`)}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-1 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditClick}
              className="h-7 w-7 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20"
              aria-label={t("common.edit")}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteClick}
              className="h-7 w-7 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20"
              aria-label={t("common.delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-2 pl-9 pr-8 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words flex flex-col gap-3">
            {todo.description && (
              <div>
                <LinkifiedText text={todo.description} />
              </div>
            )}

            {todo.attachments && todo.attachments.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  {t("task.attachments", "첨부파일")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {todo.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`/api/todos/attachments/${att.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[150px]">
                        {att.originalName}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <TodoEditModal todo={todo} onClose={() => setIsEditModalOpen(false)} />
      )}
    </>
  );
}

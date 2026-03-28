import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Todo } from "@/entities/todo/model/types";
import {
  useUpdateTodoStatus,
  useDeleteTodo,
  useCompleteVirtualTodo,
  useCopyToToday,
} from "@/features/todo/model/hooks";
import { Badge, Button, ConfirmModal } from "@zebra/core/client";
import { format } from "date-fns";
import {
  Trash2,
  Edit2,
  Repeat,
  Paperclip,
  CopyPlus,
  Pin,
  Circle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { safeParseDate, getDateLocale, cn } from "@/shared/lib";

import { TodoEditModal } from "./TodoEditModal";
import { LinkifiedText } from "@/shared/lib";
import { Toast } from "@/shared/ui";

interface TodoItemProps {
  todo: Todo;
}

export function TodoItem({ todo }: TodoItemProps) {
  const { t } = useTranslation();
  const updateTodo = useUpdateTodoStatus();
  const deleteTodo = useDeleteTodo();
  const completeVirtualTodo = useCompleteVirtualTodo();
  const copyToToday = useCopyToToday();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const isDone = todo.status === "DONE";
  const isInProgress = todo.status === "IN_PROGRESS";
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isToday = format(new Date(todo.dueDate), "yyyy-MM-dd") === todayStr;
  const isOverdue =
    !isDone &&
    safeParseDate(todo.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

  // Left border color by priority
  const effectivePriority =
    todo.priority || (todo.isImportant ? "HIGH" : undefined);
  const priorityBorderClass = effectivePriority
    ? {
        HIGH: "border-l-[3px] !border-l-red-500",
        MEDIUM: "border-l-[3px] !border-l-amber-400",
        LOW: "border-l-[3px] !border-l-emerald-500",
      }[effectivePriority]
    : "";

  // Cycle: TODO → IN_PROGRESS → DONE → TODO
  const handleToggle = () => {
    if (todo.isVirtual) {
      const realId = todo.id.replace(/^virtual-/, "").replace(/-\d+$/, "");
      const targetDate = format(todo.dueDate, "yyyy-MM-dd");
      completeVirtualTodo.mutate({ id: realId, targetDate });
      return;
    }

    const nextStatus =
      todo.status === "TODO"
        ? "IN_PROGRESS"
        : todo.status === "IN_PROGRESS"
          ? "DONE"
          : "TODO";

    updateTodo.mutate({
      id: todo.id,
      updates: {
        status: nextStatus,
        completedAt: nextStatus === "DONE" ? new Date() : undefined,
      },
    });
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(true);
  };

  const handleCopyToToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const realId = todo.id.startsWith("virtual-")
      ? todo.id.replace(/^virtual-/, "").replace(/-\d+$/, "")
      : todo.id;
    copyToToday.mutate(realId, {
      onSuccess: () =>
        setToastMessage(
          t("task.copied_to_today", "오늘 일정으로 복사되었습니다"),
        ),
    });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
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
        ${todo.isVirtual ? "opacity-70 bg-gray-50 dark:bg-gray-800/50" : ""}
        ${priorityBorderClass}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            {/* 3-state status button: TODO(circle) → IN_PROGRESS(clock) → DONE(check) */}
            <button
              type="button"
              onClick={handleToggle}
              className={cn(
                "shrink-0 h-5 w-5 flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isDone && "text-green-500",
                isInProgress && "text-blue-500",
                !isDone && !isInProgress && "text-gray-400 dark:text-gray-500",
              )}
              aria-label={
                isDone
                  ? t("task.mark_todo", "할 일로 표시")
                  : isInProgress
                    ? t("task.mark_complete", "완료로 표시")
                    : t("task.mark_in_progress", "진행중으로 표시")
              }
            >
              {isDone ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : isInProgress ? (
                <Clock className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>

            <div
              className="flex flex-col gap-1 overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm px-1 -mx-1"
              onClick={() => setIsExpanded(!isExpanded)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-controls={`todo-content-${todo.id}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-medium truncate",
                    isDone && "line-through text-gray-500 dark:text-gray-400",
                    isInProgress && "text-blue-600 dark:text-blue-400",
                    !isDone &&
                      !isInProgress &&
                      "text-gray-900 dark:text-gray-100",
                  )}
                >
                  {todo.title}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap sm:flex-nowrap">
                {isInProgress && (
                  <>
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0.5 text-[10px] flex items-center gap-1 whitespace-nowrap shrink-0 !bg-blue-50 !text-blue-600 dark:!bg-blue-900/30 dark:!text-blue-400"
                    >
                      <Clock className="h-3 w-3" />
                      {t("task.in_progress", "진행중")}
                    </Badge>
                    {(todo.description ||
                      todo.recurring.type !== "NONE" ||
                      todo.isPinned ||
                      todo.isCopied) && <span>•</span>}
                  </>
                )}
                {todo.description && !isExpanded && (
                  <span className="truncate max-w-[200px]">
                    {todo.description}
                  </span>
                )}
                {todo.description && !isExpanded && <span>•</span>}
                <span
                  className={`whitespace-nowrap ${isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}
                >
                  {format(new Date(todo.dueDate), t("task.date_format"), {
                    locale: getDateLocale(),
                  })}
                </span>
                {todo.isPinned && (
                  <>
                    <span>•</span>
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0.5 text-[10px] flex items-center gap-1 dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap shrink-0 !bg-amber-50 !text-amber-700 dark:!bg-amber-900/30 dark:!text-amber-400"
                    >
                      <Pin className="h-3 w-3" />
                      {t("task.pinned", "고정")}
                    </Badge>
                  </>
                )}
                {todo.isCopied && (
                  <>
                    <span>•</span>
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0.5 text-[10px] flex items-center gap-1 dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap shrink-0 !bg-sky-50 !text-sky-700 dark:!bg-sky-900/30 dark:!text-sky-400"
                    >
                      <CopyPlus className="h-3 w-3" />
                      {t("task.copied", "복사됨")}
                    </Badge>
                  </>
                )}
                {todo.recurring.type !== "NONE" && (
                  <>
                    <span>•</span>
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0.5 text-[10px] flex items-center gap-1 dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap shrink-0"
                    >
                      <Repeat className="h-3 w-3" />
                      {t(
                        `task.repeat_${todo.recurring?.type?.toLowerCase() || "none"}`,
                      )}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-1 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
            {!isToday && !isDone && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyToToday}
                className="h-7 w-7 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 flex-shrink-0 bg-transparent hover:bg-green-50 dark:hover:bg-green-900/20"
                aria-label={t("task.copy_to_today", "오늘로 복사")}
              >
                <CopyPlus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditClick}
              className="h-7 w-7 text-gray-400 dark:text-gray-500 hover:text-primary flex-shrink-0 bg-transparent hover:bg-primary/10 transition-colors"
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
          <div
            id={`todo-content-${todo.id}`}
            className="mt-2 pl-9 pr-8 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words flex flex-col gap-3"
          >
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
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors"
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

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title={t("task.delete_confirm_title", "할일 삭제")}
        /* Force Tailwind to generate classes: bg-destructive bg-card text-card-foreground shadow-2xl */
        className="!bg-card !text-card-foreground !border !border-border shadow-2xl"
        message={
          todo.recurring.type !== "NONE"
            ? t(
                "task.delete_recurring_confirm_msg",
                "이 할일은 반복 일정입니다. 삭제하면 모든 반복 회차가 함께 삭제됩니다. 정말 삭제하시겠습니까?",
              )
            : t("task.delete_confirm_msg", "정말 이 할일을 삭제하시겠습니까?")
        }
        confirmLabel={t("common.delete", "삭제")}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </>
  );
}

import { useState } from "react";
import type { Todo, RecurringType } from "@/entities/todo/model/types";
import {
  useUpdateTodoStatus,
  useDeleteTodo,
} from "@/features/todo/model/hooks";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Badge } from "@/shared/ui/Badge";
import { format } from "date-fns";
import { Star, Trash2, Edit2, Repeat } from "lucide-react";

import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Select } from "@/shared/ui/Select";

interface TodoItemProps {
  todo: Todo;
}

export function TodoItem({ todo }: TodoItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const updateTodo = useUpdateTodoStatus();
  const deleteTodo = useDeleteTodo();

  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description || "");
  const [editImportant, setEditImportant] = useState(todo.isImportant);
  const [editRecurringType, setEditRecurringType] = useState<RecurringType>(
    todo.recurring.type,
  );
  const [editWeeklyDays, setEditWeeklyDays] = useState<number[]>(
    todo.recurring.weeklyDays || [],
  );
  const [editMonthlyNthWeek, setEditMonthlyNthWeek] = useState<number>(
    todo.recurring.monthlyNthWeek || 1,
  );
  const [editMonthlyDayOfWeek, setEditMonthlyDayOfWeek] = useState<number>(
    todo.recurring.monthlyDayOfWeek || 0,
  );

  const DAYS_OF_WEEK = [
    { value: 0, label: "일" },
    { value: 1, label: "월" },
    { value: 2, label: "화" },
    { value: 3, label: "수" },
    { value: 4, label: "목" },
    { value: 5, label: "금" },
    { value: 6, label: "토" },
  ];

  const handleDayToggle = (day: number) => {
    setEditWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const isDone = todo.status === "DONE";
  const isOverdue =
    !isDone &&
    new Date(todo.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

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

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    updateTodo.mutate(
      {
        id: todo.id,
        updates: {
          title: editTitle.trim(),
          description: editDesc.trim(),
          isImportant: editImportant,
          recurring: {
            type: editRecurringType,
            weeklyDays:
              editRecurringType === "WEEKLY" ? editWeeklyDays : undefined,
            monthlyNthWeek:
              editRecurringType === "MONTHLY" ? editMonthlyNthWeek : undefined,
            monthlyDayOfWeek:
              editRecurringType === "MONTHLY"
                ? editMonthlyDayOfWeek
                : undefined,
          },
        },
      },
      {
        onSuccess: () => setIsEditing(false),
      },
    );
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border p-4 bg-gray-50">
        <div className="flex items-center gap-2">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 bg-white"
            placeholder="할 일 제목"
            autoFocus
          />
          <Checkbox
            checked={editImportant}
            onChange={(e) => setEditImportant(e.target.checked)}
          />
          <span className="text-sm font-medium">중요</span>
        </div>
        <Textarea
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          className="bg-white"
          placeholder="상세 내용"
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={editRecurringType}
            onChange={(e) =>
              setEditRecurringType(e.target.value as RecurringType)
            }
            className="w-full sm:w-40 bg-white"
          >
            <option value="NONE">반복 안함</option>
            <option value="DAILY">매일</option>
            <option value="WEEKLY">매주</option>
            <option value="MONTHLY">매월</option>
            <option value="YEARLY">매년</option>
          </Select>

          {editRecurringType === "WEEKLY" && (
            <div className="flex items-center gap-1">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                    editWeeklyDays.includes(day.value)
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          )}

          {editRecurringType === "MONTHLY" && (
            <div className="flex items-center gap-1 mt-2 sm:mt-0">
              <span className="text-sm font-medium text-gray-700 mx-1">
                매월:
              </span>
              <Select
                value={editMonthlyNthWeek}
                onChange={(e) => setEditMonthlyNthWeek(Number(e.target.value))}
                className="w-24 bg-white text-xs"
              >
                <option value={1}>첫째 주</option>
                <option value={2}>둘째 주</option>
                <option value={3}>셋째 주</option>
                <option value={4}>넷째 주</option>
                <option value={5}>마지막 주</option>
              </Select>
              <Select
                value={editMonthlyDayOfWeek}
                onChange={(e) =>
                  setEditMonthlyDayOfWeek(Number(e.target.value))
                }
                className="w-20 bg-white text-xs"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setIsEditing(false)}>
            취소
          </Button>
          <Button onClick={handleSaveEdit}>저장</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex flex-col gap-2 rounded-lg border p-4 transition-all hover:bg-gray-50 bg-white ${isDone ? "opacity-60" : ""}`}
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

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-blue-600 flex-shrink-0"
            aria-label="Edit todo"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteTodo.mutate(todo.id)}
            className="text-gray-400 hover:text-red-600 flex-shrink-0"
            aria-label="Delete todo"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && todo.description && (
        <div className="mt-2 pl-9 pr-8 text-sm text-gray-700 whitespace-pre-wrap">
          {todo.description}
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef } from "react";
import type { RecurringType, TodoStatus } from "@/entities/todo/model/types";
import { useCreateTodo } from "@/features/todo/model/hooks";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Select } from "@/shared/ui/Select";
import { Checkbox } from "@/shared/ui/Checkbox";
import { format } from "date-fns";
import { X } from "lucide-react";
import { getNextValidDueDate } from "@/shared/lib/recurringDate";

interface TodoCreateProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TodoCreate({ onSuccess, onCancel }: TodoCreateProps) {
  const createTodo = useCreateTodo();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [recurring, setRecurring] = useState<RecurringType>("NONE");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);

  const [monthlyType, setMonthlyType] = useState<"DATE" | "NTH">("DATE");
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [monthlyNthWeek, setMonthlyNthWeek] = useState<number>(1);
  const [monthlyDayOfWeek, setMonthlyDayOfWeek] = useState<number>(0);

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
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || createTodo.isPending) return;

    createTodo.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        isImportant,
        dueDate: getNextValidDueDate(dueDate, {
          type: recurring,
          weeklyDays: recurring === "WEEKLY" ? weeklyDays : undefined,
          monthlyDay:
            recurring === "MONTHLY" && monthlyType === "DATE"
              ? monthlyDay
              : undefined,
          monthlyNthWeek:
            recurring === "MONTHLY" && monthlyType === "NTH"
              ? monthlyNthWeek
              : undefined,
          monthlyDayOfWeek:
            recurring === "MONTHLY" && monthlyType === "NTH"
              ? monthlyDayOfWeek
              : undefined,
        }),
        status: "TODO" as TodoStatus,
        recurring: {
          type: recurring,
          weeklyDays: recurring === "WEEKLY" ? weeklyDays : undefined,
          monthlyDay:
            recurring === "MONTHLY" && monthlyType === "DATE"
              ? monthlyDay
              : undefined,
          monthlyNthWeek:
            recurring === "MONTHLY" && monthlyType === "NTH"
              ? monthlyNthWeek
              : undefined,
          monthlyDayOfWeek:
            recurring === "MONTHLY" && monthlyType === "NTH"
              ? monthlyDayOfWeek
              : undefined,
        },
      },
      {
        onSuccess: () => {
          // Reset form and focus title for UX (Continuous entry)
          setTitle("");
          setDescription("");
          setIsImportant(false);
          setDueDate(format(new Date(), "yyyy-MM-dd"));
          setRecurring("NONE");
          setWeeklyDays([]);
          setMonthlyType("DATE");
          setMonthlyDay(1);
          setMonthlyNthWeek(1);
          setMonthlyDayOfWeek(0);

          if (onSuccess) {
            onSuccess();
          } else {
            // Accessibility & UX focus feature described in GEMINI.md
            titleInputRef.current?.focus();
          }
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm relative"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">새 할일 추가 (Add Big Stone)</h3>
        {onCancel && (
          <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5 text-gray-500" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          ref={titleInputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할일 제목 (필수)"
          required
          className="flex-1"
        />
        <div className="flex items-center gap-2 px-2">
          <Checkbox
            id="important-check"
            checked={isImportant}
            onChange={(e) => setIsImportant(e.target.checked)}
          />
          <label
            htmlFor="important-check"
            className="text-sm cursor-pointer select-none"
          >
            중요
          </label>
        </div>
      </div>

      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="내용 (선택) - 상세한 할 일 내용을 적어보세요."
        className="resize-y"
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full sm:w-40"
        />

        <Select
          value={recurring}
          onChange={(e) => setRecurring(e.target.value as RecurringType)}
          className="w-full sm:w-40"
        >
          <option value="NONE">반복 안함</option>
          <option value="DAILY">매일</option>
          <option value="WEEKLY">매주</option>
          <option value="MONTHLY">매월</option>
          <option value="YEARLY">매년</option>
        </Select>

        <Button type="submit" className="ml-auto w-full sm:w-auto">
          추가
        </Button>
      </div>

      {recurring === "WEEKLY" && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-medium text-gray-700 mr-2">
            반복 요일:
          </span>
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => handleDayToggle(day.value)}
              className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${weeklyDays.includes(day.value)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      )}

      {recurring === "MONTHLY" && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-medium text-gray-700 mr-2">매월:</span>
          <Select
            value={monthlyType}
            onChange={(e) => setMonthlyType(e.target.value as "DATE" | "NTH")}
            className="w-32 bg-white"
          >
            <option value="DATE">특정 일자</option>
            <option value="NTH">특정 요일</option>
          </Select>

          {monthlyType === "DATE" ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                max={31}
                value={monthlyDay}
                onChange={(e) => setMonthlyDay(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm">일</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Select
                value={monthlyNthWeek}
                onChange={(e) => setMonthlyNthWeek(Number(e.target.value))}
                className="w-24 bg-white"
              >
                <option value={1}>첫째 주</option>
                <option value={2}>둘째 주</option>
                <option value={3}>셋째 주</option>
                <option value={4}>넷째 주</option>
                <option value={5}>마지막 주</option>
              </Select>
              <Select
                value={monthlyDayOfWeek}
                onChange={(e) => setMonthlyDayOfWeek(Number(e.target.value))}
                className="w-24 bg-white"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}요일
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

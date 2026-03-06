import React, { useState, useRef } from "react";
import type {
  RecurringType,
  TodoStatus,
  RecurringEndOption,
  TodoPriority,
} from "@/entities/todo/model/types";
import { useCreateTodo } from "@/features/todo/model/hooks";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Select } from "@/shared/ui/Select";
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
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [recurring, setRecurring] = useState<RecurringType>("NONE");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);

  // Advanced Recurring
  const [endOption, setEndOption] = useState<RecurringEndOption>("NONE");
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endOccurrences, setEndOccurrences] = useState<number>(10);

  const [monthlyType, setMonthlyType] = useState<"DATE" | "NTH">("DATE");
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [monthlyNthWeek, setMonthlyNthWeek] = useState<number>(1);
  const [monthlyDayOfWeek, setMonthlyDayOfWeek] = useState<number>(0);

  const [yearlyMonth, setYearlyMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [yearlyDay, setYearlyDay] = useState<number>(new Date().getDate());

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
        isImportant: priority === "HIGH", // legacy fallback
        priority,
        // dueDate serves as the start anchor for recurrences universally now
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
          yearlyMonth: recurring === "YEARLY" ? yearlyMonth : undefined,
          yearlyDay: recurring === "YEARLY" ? yearlyDay : undefined,
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
          yearlyMonth: recurring === "YEARLY" ? yearlyMonth : undefined,
          yearlyDay: recurring === "YEARLY" ? yearlyDay : undefined,
          startDate: recurring !== "NONE" ? dueDate : undefined,
          endOption: recurring !== "NONE" ? endOption : "NONE",
          endDate: endOption === "DATE" ? endDate : undefined,
          endOccurrences:
            endOption === "OCCURRENCES" ? endOccurrences : undefined,
        },
      },
      {
        onSuccess: () => {
          // Reset form and focus title for UX (Continuous entry)
          setTitle("");
          setDescription("");
          setPriority("MEDIUM");
          setDueDate(format(new Date(), "yyyy-MM-dd"));
          setRecurring("NONE");
          setWeeklyDays([]);
          setMonthlyType("DATE");
          setMonthlyDay(1);
          setMonthlyNthWeek(1);
          setMonthlyDayOfWeek(0);
          setYearlyMonth(new Date().getMonth() + 1);
          setYearlyDay(new Date().getDate());
          setEndOption("NONE");
          setEndDate(format(new Date(), "yyyy-MM-dd"));
          setEndOccurrences(10);

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
          autoFocus
          className="flex-1"
        />
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TodoPriority)}
          className="w-full sm:w-32 bg-white"
        >
          <option value="HIGH">⭐⭐⭐ 높음</option>
          <option value="MEDIUM">⭐⭐ 보통</option>
          <option value="LOW">⭐ 낮음</option>
        </Select>
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
              className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${
                weeklyDays.includes(day.value)
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

      {recurring === "YEARLY" && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-medium text-gray-700 mx-1">매년:</span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={12}
              value={yearlyMonth}
              onChange={(e) => setYearlyMonth(Number(e.target.value))}
              className="w-16"
            />
            <span className="text-sm">월</span>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={31}
              value={yearlyDay}
              onChange={(e) => setYearlyDay(Number(e.target.value))}
              className="w-16"
            />
            <span className="text-sm">일</span>
          </div>
        </div>
      )}

      {recurring !== "NONE" && (
        <div className="flex flex-col gap-3 mt-4 border-t border-gray-100 pt-4">
          <div className="flex bg-gray-50 p-4 rounded-lg flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-medium text-gray-700 w-20 shrink-0">
                종료 조건:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={endOption}
                  onChange={(e) =>
                    setEndOption(e.target.value as RecurringEndOption)
                  }
                  className="w-32 bg-white"
                >
                  <option value="NONE">없음</option>
                  <option value="DATE">날짜 지정</option>
                  <option value="OCCURRENCES">횟수 지정</option>
                </Select>

                {endOption === "DATE" && (
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40 bg-white"
                  />
                )}

                {endOption === "OCCURRENCES" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={endOccurrences}
                      onChange={(e) =>
                        setEndOccurrences(Number(e.target.value))
                      }
                      className="w-20 bg-white"
                    />
                    <span className="text-sm text-gray-600">
                      회 반복 후 종료
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

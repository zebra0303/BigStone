import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type {
  Todo,
  RecurringType,
  RecurringEndOption,
  TodoPriority,
} from "@/entities/todo/model/types";
import {
  useUpdateTodoStatus,
  useUploadAttachment,
  useDeleteAttachment,
} from "@/features/todo/model/hooks";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Select } from "@/shared/ui/Select";
import { PrioritySelect } from "./PrioritySelect";
import { format } from "date-fns";
import { X, Paperclip, Loader2 } from "lucide-react";
import { getNextValidDueDate, safeParseDate } from "@/shared/lib/recurringDate";

interface TodoEditModalProps {
  todo: Todo;
  onClose: () => void;
}

export function TodoEditModal({ todo, onClose }: TodoEditModalProps) {
  const { t } = useTranslation();
  const updateTodo = useUpdateTodoStatus();
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const DAYS_OF_WEEK = [
    { value: 0, label: t("common.days.sun", "일") },
    { value: 1, label: t("common.days.mon", "월") },
    { value: 2, label: t("common.days.tue", "화") },
    { value: 3, label: t("common.days.wed", "수") },
    { value: 4, label: t("common.days.thu", "목") },
    { value: 5, label: t("common.days.fri", "금") },
    { value: 6, label: t("common.days.sat", "토") },
  ];

  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description || "");
  const [priority, setPriority] = useState<TodoPriority>(
    todo.priority || (todo.isImportant ? "HIGH" : "MEDIUM"),
  );

  const originalDateStr = format(
    safeParseDate(todo.recurring.startDate || todo.dueDate),
    "yyyy-MM-dd",
  );

  const [dueDate, setDueDate] = useState(originalDateStr);

  const [recurring, setRecurring] = useState<RecurringType>(
    todo.recurring.type,
  );
  const [weeklyDays, setWeeklyDays] = useState<number[]>(
    todo.recurring.weeklyDays || [],
  );

  // Advanced Recurring
  const [endOption, setEndOption] = useState<RecurringEndOption>(
    todo.recurring.endOption || "NONE",
  );
  const [endDate, setEndDate] = useState(
    todo.recurring.endDate || format(new Date(), "yyyy-MM-dd"),
  );
  const [endOccurrences, setEndOccurrences] = useState<number>(
    todo.recurring.endOccurrences || 10,
  );

  const [monthlyType, setMonthlyType] = useState<"DATE" | "NTH">(
    todo.recurring.monthlyNthWeek ? "NTH" : "DATE",
  );
  const [monthlyDay, setMonthlyDay] = useState<number>(
    todo.recurring.monthlyDay || 1,
  );
  const [monthlyNthWeek, setMonthlyNthWeek] = useState<number>(
    todo.recurring.monthlyNthWeek || 1,
  );
  const [monthlyDayOfWeek, setMonthlyDayOfWeek] = useState<number>(
    todo.recurring.monthlyDayOfWeek || 0,
  );

  const [yearlyMonth, setYearlyMonth] = useState<number>(
    todo.recurring.yearlyMonth || new Date().getMonth() + 1,
  );
  const [yearlyDay, setYearlyDay] = useState<number>(
    todo.recurring.yearlyDay || new Date().getDate(),
  );

  // Auto-focus on open
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleDayToggle = (day: number) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    // For attachments, we need the true group ID.
    // Virtual tasks have 'groupId' field populated from DB fetch in backend.
    // If not, we fallback to parsing the id.
    const realGroupId =
      todo.groupId ||
      (todo.id.startsWith("virtual-")
        ? todo.id.replace(/^virtual-/, "").replace(/-\d+$/, "")
        : todo.id);

    const file = e.target.files[0];

    // Max size 10MB check
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    uploadAttachment.mutate({ groupId: realGroupId, file });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileDelete = (attachmentId: string) => {
    if (window.confirm("Are you sure you want to delete this attachment?")) {
      deleteAttachment.mutate(attachmentId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || updateTodo.isPending) return;

    // If it's a virtual projection, extract the original base ID to update the actual recurring series
    // Format: "virtual-{uuid}-{projectionCount}"
    const realId = todo.id.startsWith("virtual-")
      ? todo.id.replace(/^virtual-/, "").replace(/-\d+$/, "")
      : todo.id;

    updateTodo.mutate(
      {
        id: realId,
        updates: {
          title: title.trim(),
          description: description.trim(),
          isImportant: priority === "HIGH", // legacy fallback
          priority,
          // Only update the instance's dueDate if the user actually modified the date input.
          // Otherwise, it might erroneously pull the recurring series' startDate and move the current instance backwards.
          ...(dueDate !== originalDateStr
            ? {
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
              }
            : {}),
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
            startDate: recurring !== "NONE" ? dueDate : undefined, // Inherit dueDate as anchor
            endOption: recurring !== "NONE" ? endOption : "NONE",
            endDate: endOption === "DATE" ? endDate : undefined,
            endOccurrences:
              endOption === "OCCURRENCES" ? endOccurrences : undefined,
          },
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6 shadow-2xl backdrop-blur-sm">
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <img
              src="/stone.png"
              alt="Big Stone"
              className="h-6 w-6 object-contain"
            />
            <h2 className="text-lg font-semibold text-gray-900">
              {t("task.edit_task")}
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5 text-gray-500 hover:text-gray-900" />
          </Button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5 bg-white"
        >
          <div className="flex flex-col gap-4 sm:flex-row">
            <Input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("task.title_placeholder")}
              required
              className="flex-1"
            />
            <PrioritySelect
              value={priority}
              onChange={(val) => setPriority(val)}
              className="w-full sm:w-32 shrink-0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("task.desc_placeholder")}
              className="resize-y min-h-[100px]"
            />

            {/* Attachment Section */}
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-gray-600 flex items-center gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAttachment.isPending}
              >
                {uploadAttachment.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                {t("task.attach_file", "파일 첨부")}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Attachment List */}
            {todo.attachments && todo.attachments.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {todo.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-2 text-sm"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                      <a
                        href={`/api/todos/attachments/${att.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {att.originalName}
                      </a>
                      <span className="text-gray-400 text-xs shrink-0">
                        ({(att.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={() => handleFileDelete(att.id)}
                      disabled={deleteAttachment.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
            <div className="w-full sm:w-auto flex-1 sm:flex-none">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wider">
                {t("common.date", "일자")}
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <div className="w-full sm:w-auto flex-1 sm:flex-none">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wider">
                {t("common.repeat", "반복")}
              </label>
              <Select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as RecurringType)}
                className="w-full sm:w-40"
              >
                <option value="NONE">{t("task.repeat_none")}</option>
                <option value="DAILY">{t("task.repeat_daily")}</option>
                <option value="WEEKLY">{t("task.repeat_weekly")}</option>
                <option value="MONTHLY">{t("task.repeat_monthly")}</option>
                <option value="YEARLY">{t("task.repeat_yearly")}</option>
              </Select>
            </div>
          </div>

          {recurring === "WEEKLY" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium text-gray-700 mr-2 shrink-0">
                {t("task.repeat_days", "반복 요일:")}
              </span>
              <div className="flex flex-wrap gap-1.5">
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
            </div>
          )}

          {recurring === "MONTHLY" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-2">
              <span className="text-sm font-medium text-gray-700 shrink-0">
                {t("task.repeat_monthly_label", "매월:")}
              </span>
              <Select
                value={monthlyType}
                onChange={(e) =>
                  setMonthlyType(e.target.value as "DATE" | "NTH")
                }
                className="w-full sm:w-32 bg-white"
              >
                <option value="DATE">
                  {t("task.monthly_type_date", "특정 일자")}
                </option>
                <option value="NTH">
                  {t("task.monthly_type_nth", "특정 요일")}
                </option>
              </Select>

              {monthlyType === "DATE" ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={monthlyDay}
                    onChange={(e) => setMonthlyDay(parseInt(e.target.value))}
                    className="w-20 bg-white"
                  />
                  <span className="text-sm text-gray-600">
                    {t("common.day_unit", "일")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={monthlyNthWeek}
                    onChange={(e) =>
                      setMonthlyNthWeek(parseInt(e.target.value))
                    }
                    className="w-16 bg-white"
                  />
                  <span className="text-sm text-gray-600">
                    {t("common.nth_unit", "번째")}
                  </span>
                  <Select
                    value={monthlyDayOfWeek}
                    onChange={(e) =>
                      setMonthlyDayOfWeek(parseInt(e.target.value))
                    }
                    className="w-24 bg-white"
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
          )}

          {recurring === "YEARLY" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium text-gray-700 mr-2 shrink-0">
                {t("task.repeat_yearly_label", "매년:")}
              </span>
              <Input
                type="number"
                min={1}
                max={12}
                value={yearlyMonth}
                onChange={(e) => setYearlyMonth(parseInt(e.target.value))}
                className="w-20 bg-white"
              />
              <span className="text-sm text-gray-600">
                {t("common.month_unit", "월")}
              </span>
              <Input
                type="number"
                min={1}
                max={31}
                value={yearlyDay}
                onChange={(e) => setYearlyDay(parseInt(e.target.value))}
                className="w-20 bg-white"
              />
              <span className="text-sm text-gray-600">
                {t("common.day_unit", "일")}
              </span>
            </div>
          )}

          {recurring !== "NONE" && (
            <div className="flex flex-col gap-3 mt-4 border-t border-gray-100 pt-4">
              <div className="flex bg-gray-50 p-4 rounded-lg flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-20 shrink-0">
                    {t("task.end_condition_label", "종료 조건:")}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={endOption}
                      onChange={(e) =>
                        setEndOption(e.target.value as RecurringEndOption)
                      }
                      className="w-40 bg-white"
                    >
                      <option value="NONE">
                        {t("task.end_condition_none")}
                      </option>
                      <option value="DATE">
                        {t("task.end_condition_date")}
                      </option>
                      <option value="OCCURRENCES">
                        {t("task.end_condition_count")}
                      </option>
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
                            setEndOccurrences(parseInt(e.target.value))
                          }
                          className="w-24 bg-white"
                        />
                        <span className="text-sm text-gray-600">
                          {t("common.count_unit", "회")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={updateTodo.isPending}
          >
            {updateTodo.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

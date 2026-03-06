import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import type {
  RecurringType,
  TodoStatus,
  RecurringEndOption,
  TodoPriority,
} from "@/entities/todo/model/types";
import { useCreateTodo } from "@/features/todo/model/hooks";
import { todoApi } from "@/shared/api/todoApi";
import { useQueryClient } from "@tanstack/react-query";
import { TODO_QUERY_KEY } from "@/features/todo/model/hooks";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Select } from "@/shared/ui/Select";
import { PrioritySelect } from "./PrioritySelect";
import { format } from "date-fns";
import { X, Paperclip, Loader2 } from "lucide-react";
import { getNextValidDueDate } from "@/shared/lib/recurringDate";

interface TodoCreateProps {
  initialDate?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TodoCreate({
  initialDate,
  onSuccess,
  onCancel,
}: TodoCreateProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createTodo = useCreateTodo();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState(
    initialDate || format(new Date(), "yyyy-MM-dd"),
  );
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

  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const DAYS_OF_WEEK = [
    { value: 0, label: t("common.days.sun", "일") },
    { value: 1, label: t("common.days.mon", "월") },
    { value: 2, label: t("common.days.tue", "화") },
    { value: 3, label: t("common.days.wed", "수") },
    { value: 4, label: t("common.days.thu", "목") },
    { value: 5, label: t("common.days.fri", "금") },
    { value: 6, label: t("common.days.sat", "토") },
  ];

  const handleDayToggle = (day: number) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    const validFiles = newFiles.filter((f) => {
      if (f.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit.");
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || createTodo.isPending || isUploading) return;

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
        onSuccess: async (data) => {
          if (files.length > 0 && data?.groupId) {
            setIsUploading(true);
            try {
              for (const file of files) {
                await todoApi.uploadAttachment(data.groupId, file);
              }
              // Invalidate queries again to fetch the new attachments
              queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
            } catch (err) {
              console.error("Failed to upload attachments", err);
              alert("Some attachments failed to upload.");
            } finally {
              setIsUploading(false);
            }
          }

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
          setFiles([]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6 shadow-2xl backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("home.add_task")}
          </h2>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCancel}
            >
              <X className="h-5 w-5 text-gray-500 hover:text-gray-900" />
            </Button>
          )}
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
              autoFocus
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
                disabled={isUploading || createTodo.isPending}
              >
                {isUploading ? (
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
                multiple
                onChange={handleFileUpload}
              />
            </div>

            {/* Attachment List */}
            {files.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-2 text-sm"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-gray-700 truncate">
                        {file.name}
                      </span>
                      <span className="text-gray-400 text-xs shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={() => handleFileRemove(idx)}
                      disabled={isUploading || createTodo.isPending}
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
              <span className="text-sm font-medium text-gray-700 mr-2">
                {t("task.repeat_days", "반복 요일:")}
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
              <span className="text-sm font-medium text-gray-700 mr-2">
                {t("task.repeat_monthly_label", "매월:")}
              </span>
              <Select
                value={monthlyType}
                onChange={(e) =>
                  setMonthlyType(e.target.value as "DATE" | "NTH")
                }
                className="w-32 bg-white"
              >
                <option value="DATE">
                  {t("task.monthly_type_date", "특정 일자")}
                </option>
                <option value="NTH">
                  {t("task.monthly_type_nth", "특정 요일")}
                </option>
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
                  <span className="text-sm">{t("common.day_unit", "일")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Select
                    value={monthlyNthWeek}
                    onChange={(e) => setMonthlyNthWeek(Number(e.target.value))}
                    className="w-24 bg-white"
                  >
                    <option value={1}>{t("task.nth_1", "첫째 주")}</option>
                    <option value={2}>{t("task.nth_2", "둘째 주")}</option>
                    <option value={3}>{t("task.nth_3", "셋째 주")}</option>
                    <option value={4}>{t("task.nth_4", "넷째 주")}</option>
                    <option value={5}>{t("task.nth_5", "마지막 주")}</option>
                  </Select>
                  <Select
                    value={monthlyDayOfWeek}
                    onChange={(e) =>
                      setMonthlyDayOfWeek(Number(e.target.value))
                    }
                    className="w-24 bg-white"
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                        {t("common.day_suffix", "요일")}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          )}

          {recurring === "YEARLY" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium text-gray-700 mx-1">
                {t("task.repeat_yearly_label", "매년:")}
              </span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={yearlyMonth}
                  onChange={(e) => setYearlyMonth(Number(e.target.value))}
                  className="w-16"
                />
                <span className="text-sm">{t("common.month_unit", "월")}</span>
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
                <span className="text-sm">{t("common.day_unit", "일")}</span>
              </div>
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
                      className="w-32 bg-white"
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
                            setEndOccurrences(Number(e.target.value))
                          }
                          className="w-20 bg-white"
                        />
                        <span className="text-sm text-gray-600">
                          {t("task.end_occurrences_suffix", "회 반복 후 종료")}
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
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createTodo.isPending || isUploading}
          >
            {createTodo.isPending || isUploading
              ? t("common.saving", "저장 중...")
              : t("common.save", "저장")}
          </Button>
        </div>
      </div>
    </div>
  );
}

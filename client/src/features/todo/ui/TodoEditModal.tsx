import React, { useState, useEffect, useRef } from "react";
import type { Todo, RecurringType, RecurringEndOption } from "@/entities/todo/model/types";
import { useUpdateTodoStatus } from "@/features/todo/model/hooks";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Select } from "@/shared/ui/Select";
import { Checkbox } from "@/shared/ui/Checkbox";
import { format } from "date-fns";
import { X } from "lucide-react";
import { getNextValidDueDate, safeParseDate } from "@/shared/lib/recurringDate";

interface TodoEditModalProps {
    todo: Todo;
    onClose: () => void;
}

const DAYS_OF_WEEK = [
    { value: 0, label: "일" },
    { value: 1, label: "월" },
    { value: 2, label: "화" },
    { value: 3, label: "수" },
    { value: 4, label: "목" },
    { value: 5, label: "금" },
    { value: 6, label: "토" },
];

export function TodoEditModal({ todo, onClose }: TodoEditModalProps) {
    const updateTodo = useUpdateTodoStatus();
    const titleInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState(todo.title);
    const [description, setDescription] = useState(todo.description || "");
    const [isImportant, setIsImportant] = useState(todo.isImportant);
    const [dueDate, setDueDate] = useState(format(safeParseDate(todo.dueDate), "yyyy-MM-dd"));

    const [recurring, setRecurring] = useState<RecurringType>(todo.recurring.type);
    const [weeklyDays, setWeeklyDays] = useState<number[]>(todo.recurring.weeklyDays || []);

    // Advanced Recurring
    const [endOption, setEndOption] = useState<RecurringEndOption>(todo.recurring.endOption || "NONE");
    const [endDate, setEndDate] = useState(todo.recurring.endDate || format(new Date(), "yyyy-MM-dd"));
    const [endOccurrences, setEndOccurrences] = useState<number>(todo.recurring.endOccurrences || 10);

    const [monthlyType, setMonthlyType] = useState<"DATE" | "NTH">(
        todo.recurring.monthlyNthWeek ? "NTH" : "DATE"
    );
    const [monthlyDay, setMonthlyDay] = useState<number>(todo.recurring.monthlyDay || 1);
    const [monthlyNthWeek, setMonthlyNthWeek] = useState<number>(todo.recurring.monthlyNthWeek || 1);
    const [monthlyDayOfWeek, setMonthlyDayOfWeek] = useState<number>(todo.recurring.monthlyDayOfWeek || 0);

    const [yearlyMonth, setYearlyMonth] = useState<number>(todo.recurring.yearlyMonth || new Date().getMonth() + 1);
    const [yearlyDay, setYearlyDay] = useState<number>(todo.recurring.yearlyDay || new Date().getDate());

    // Auto-focus on open
    useEffect(() => {
        if (titleInputRef.current) {
            titleInputRef.current.focus();
        }
    }, []);

    // Prevent background scrolling
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleDayToggle = (day: number) => {
        setWeeklyDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
        );
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
                    isImportant,
                    dueDate: getNextValidDueDate(dueDate, {
                        type: recurring,
                        weeklyDays: recurring === "WEEKLY" ? weeklyDays : undefined,
                        monthlyDay: recurring === "MONTHLY" && monthlyType === "DATE" ? monthlyDay : undefined,
                        monthlyNthWeek: recurring === "MONTHLY" && monthlyType === "NTH" ? monthlyNthWeek : undefined,
                        monthlyDayOfWeek: recurring === "MONTHLY" && monthlyType === "NTH" ? monthlyDayOfWeek : undefined,
                        yearlyMonth: recurring === "YEARLY" ? yearlyMonth : undefined,
                        yearlyDay: recurring === "YEARLY" ? yearlyDay : undefined,
                    }),
                    recurring: {
                        type: recurring,
                        weeklyDays: recurring === "WEEKLY" ? weeklyDays : undefined,
                        monthlyDay: recurring === "MONTHLY" && monthlyType === "DATE" ? monthlyDay : undefined,
                        monthlyNthWeek: recurring === "MONTHLY" && monthlyType === "NTH" ? monthlyNthWeek : undefined,
                        monthlyDayOfWeek: recurring === "MONTHLY" && monthlyType === "NTH" ? monthlyDayOfWeek : undefined,
                        yearlyMonth: recurring === "YEARLY" ? yearlyMonth : undefined,
                        yearlyDay: recurring === "YEARLY" ? yearlyDay : undefined,
                        startDate: recurring !== "NONE" ? dueDate : undefined, // Inherit dueDate as anchor
                        endOption: recurring !== "NONE" ? endOption : "NONE",
                        endDate: endOption === "DATE" ? endDate : undefined,
                        endOccurrences: endOption === "OCCURRENCES" ? endOccurrences : undefined,
                    },
                },
            },
            {
                onSuccess: () => {
                    onClose();
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6 shadow-2xl backdrop-blur-sm">
            <div
                className="w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900">일정 수정 (Edit Big Stone)</h2>
                    <Button type="button" variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5 text-gray-500 hover:text-gray-900" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5 bg-white">
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <Input
                            ref={titleInputRef}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="할일 제목 (필수)"
                            required
                            className="flex-1"
                        />
                        <div className="flex items-center gap-2 px-2 shrink-0">
                            <Checkbox
                                id="edit-important-check"
                                checked={isImportant}
                                onChange={(e) => setIsImportant(e.target.checked)}
                            />
                            <label
                                htmlFor="edit-important-check"
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
                        className="resize-y min-h-[100px]"
                    />

                    <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                        <div className="w-full sm:w-auto flex-1 sm:flex-none">
                            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wider">일자</label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full sm:w-40"
                            />
                        </div>
                        <div className="w-full sm:w-auto flex-1 sm:flex-none">
                            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wider">반복</label>
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
                        </div>
                    </div>

                    {recurring === "WEEKLY" && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm font-medium text-gray-700 mr-2 shrink-0">
                                반복 요일:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
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
                        </div>
                    )}

                    {recurring === "MONTHLY" && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-2">
                            <span className="text-sm font-medium text-gray-700 shrink-0">매월:</span>
                            <Select
                                value={monthlyType}
                                onChange={(e) => setMonthlyType(e.target.value as "DATE" | "NTH")}
                                className="w-full sm:w-32 bg-white"
                            >
                                <option value="DATE">특정 일자</option>
                                <option value="NTH">특정 요일</option>
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
                                    <span className="text-sm text-gray-600">일</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={1}
                                        max={5}
                                        value={monthlyNthWeek}
                                        onChange={(e) => setMonthlyNthWeek(parseInt(e.target.value))}
                                        className="w-16 bg-white"
                                    />
                                    <span className="text-sm text-gray-600">번째</span>
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
                                매년:
                            </span>
                            <Input
                                type="number"
                                min={1}
                                max={12}
                                value={yearlyMonth}
                                onChange={(e) => setYearlyMonth(parseInt(e.target.value))}
                                className="w-20 bg-white"
                            />
                            <span className="text-sm text-gray-600">월</span>
                            <Input
                                type="number"
                                min={1}
                                max={31}
                                value={yearlyDay}
                                onChange={(e) => setYearlyDay(parseInt(e.target.value))}
                                className="w-20 bg-white"
                            />
                            <span className="text-sm text-gray-600">일</span>
                        </div>
                    )}

                    {recurring !== "NONE" && (
                        <div className="flex flex-col gap-3 mt-4 border-t border-gray-100 pt-4">
                            <div className="flex bg-gray-50 p-4 rounded-lg flex-col gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className="text-sm font-medium text-gray-700 w-20 shrink-0">종료 조건:</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Select
                                            value={endOption}
                                            onChange={(e) => setEndOption(e.target.value as RecurringEndOption)}
                                            className="w-40 bg-white"
                                        >
                                            <option value="NONE">조건 없음 (무한)</option>
                                            <option value="DATE">특정 날짜까지</option>
                                            <option value="OCCURRENCES">특정 횟수만큼</option>
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
                                                    onChange={(e) => setEndOccurrences(parseInt(e.target.value))}
                                                    className="w-24 bg-white"
                                                />
                                                <span className="text-sm text-gray-600">회</span>
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
                        취소
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={updateTodo.isPending}>
                        {updateTodo.isPending ? "저장 중..." : "저장"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

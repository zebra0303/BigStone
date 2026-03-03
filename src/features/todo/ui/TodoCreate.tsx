import React, { useState, useRef } from "react";
import type { RecurringType, TodoStatus } from "@/entities/todo/model/types";
import { useCreateTodo } from "@/features/todo/model/hooks";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Checkbox } from "@/shared/ui/Checkbox";
import { format } from "date-fns";

export function TodoCreate() {
  const createTodo = useCreateTodo();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [recurring, setRecurring] = useState<RecurringType>("NONE");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || createTodo.isPending) return;

    createTodo.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        isImportant,
        dueDate: new Date(dueDate),
        status: "TODO" as TodoStatus,
        recurring: { type: recurring },
      },
      {
        onSuccess: () => {
          // Reset form and focus title for UX (Continuous entry)
          setTitle("");
          setDescription("");
          setIsImportant(false);
          setDueDate(format(new Date(), "yyyy-MM-dd"));
          setRecurring("NONE");

          // Accessibility & UX focus feature described in GEMINI.md
          titleInputRef.current?.focus();
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h3 className="font-semibold text-lg">새 할일 추가 (Add Big Stone)</h3>

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

      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="내용 (선택)"
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
    </form>
  );
}

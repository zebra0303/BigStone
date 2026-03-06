import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Star, ChevronDown } from "lucide-react";
import type { TodoPriority } from "@/entities/todo/model/types";
import { cn } from "@/shared/lib/utils";

interface PrioritySelectProps {
  value: TodoPriority;
  onChange: (value: TodoPriority) => void;
  className?: string;
}

export function PrioritySelect({
  value,
  onChange,
  className,
}: PrioritySelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { val: TodoPriority; label: string; color: string }[] = [
    {
      val: "HIGH",
      label: t("task.priority_high"),
      color: "text-red-500 fill-red-500",
    },
    {
      val: "MEDIUM",
      label: t("task.priority_medium"),
      color: "text-yellow-500 fill-yellow-400",
    },
    {
      val: "LOW",
      label: t("task.priority_low"),
      color: "text-green-500 fill-green-500",
    },
  ];

  const selected = options.find((o) => o.val === value) || options[1];

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className="flex items-center gap-2">
          <Star className={cn("h-4 w-4", selected.color)} />
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {selected.label}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => {
                onChange(opt.val);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Star className={cn("h-4 w-4", opt.color)} />
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

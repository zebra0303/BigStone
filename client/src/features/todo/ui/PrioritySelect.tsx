import { useState, useRef, useEffect } from "react";
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
    { val: "HIGH", label: "높음", color: "text-red-500 fill-red-500" },
    { val: "MEDIUM", label: "보통", color: "text-yellow-500 fill-yellow-400" },
    { val: "LOW", label: "낮음", color: "text-green-500 fill-green-500" },
  ];

  const selected = options.find((o) => o.val === value) || options[1];

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="flex items-center gap-2">
          <Star className={cn("h-4 w-4", selected.color)} />
          <span className="font-medium text-gray-700">{selected.label}</span>
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => {
                onChange(opt.val);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
            >
              <Star className={cn("h-4 w-4", opt.color)} />
              <span className="font-medium text-gray-700">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

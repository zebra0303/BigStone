import { cn } from "@/shared/lib";
import type { TodoPriority } from "@/entities/todo/model/types";

interface PriorityXiProps {
  priority?: TodoPriority;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PriorityXi({
  priority,
  className,
  size = "sm",
}: PriorityXiProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const priorityStyles = {
    HIGH: {
      tieColor: "fill-red-500",
      borderColor: "border-red-500",
      glow: "drop-shadow-[0_0_2px_rgba(239,68,68,0.8)]",
    },
    MEDIUM: {
      tieColor: "fill-amber-400",
      borderColor: "border-amber-400",
      glow: "drop-shadow-[0_0_2px_rgba(247,241,59,0.8)]",
    },
    LOW: {
      tieColor: "fill-emerald-500",
      borderColor: "border-emerald-500",
      glow: "drop-shadow-[0_0_2px_rgba(16,185,129,0.8)]",
    },
  };

  const style = priority ? priorityStyles[priority] : null;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full border-[2px] bg-white dark:bg-gray-900 shadow-md overflow-hidden transition-all",
        style ? style.borderColor : "border-gray-100 dark:border-gray-800",
        sizeClasses[size],
        className,
      )}
    >
      {/* Zoomed in face of BigXi */}
      <img
        src="/bigxi.png"
        className="h-full w-full object-cover scale-[2] translate-y-[10%]"
        alt="BigXi"
      />

      {/* Bowtie Overlay */}
      {style && (
        <div
          className={cn(
            "absolute bottom-0.5 left-1/2 -translate-x-1/2 z-20 w-3/5",
            style.glow,
          )}
        >
          <svg
            viewBox="0 0 24 12"
            className={cn("w-full h-auto", style.tieColor)}
          >
            {/* Simple Bowtie Shape */}
            <path d="M2 1 L10 6 L2 11 Z" /> {/* Left wing */}
            <path d="M22 1 L14 6 L22 11 Z" /> {/* Right wing */}
            <circle cx="12" cy="6" r="2.5" /> {/* Center knot */}
          </svg>
        </div>
      )}

      {/* Very subtle border overlay to keep circular feel */}
      <div className="absolute inset-0 rounded-full border border-black/5 pointer-events-none" />
    </div>
  );
}

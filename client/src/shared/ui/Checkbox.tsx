import React from "react";
import { cn } from "../lib/utils";
import { Check } from "lucide-react";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <input
          type="checkbox"
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-gray-900 bg-transparent shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:bg-gray-900 checked:text-gray-50",
            className,
          )}
          ref={ref}
          {...props}
        />
        <Check className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100" />
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

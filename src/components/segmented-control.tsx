"use client";

import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );

  return (
    <div
      className="relative grid gap-1 rounded-2xl bg-muted p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 rounded-xl bg-background shadow-sm transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          left: "0.25rem",
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            data-tab={option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 h-10 rounded-xl px-2 text-xs font-medium transition-colors duration-200 sm:text-sm",
              active ? "font-semibold text-brand" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Splash used while SQLite/session boot, and while login/register is pending —
 * logo + progress bar (same visual language as dashboard boot).
 */
export function BootLoading({
  className,
  label = "Caricamento",
}: {
  className?: string;
  label?: string;
}) {
  const [value, setValue] = useState(28);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(78);
      return;
    }

    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      setValue((current) => {
        if (current >= 94) return 52 + (frame % 8);
        const step = current < 55 ? 12 : current < 80 ? 6 : 3;
        return Math.min(94, current + step);
      });
    }, 90);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <BrandMark framed={false} className="size-28" size={112} />
      <p className="mt-5 text-sm font-semibold tracking-tight">ExpnsTracker</p>
      <div className="mt-8 w-full max-w-[12rem]">
        <Progress value={value} className="gap-0">
          <span className="sr-only">{label}</span>
        </Progress>
      </div>
    </div>
  );
}

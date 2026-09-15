import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl bg-card px-6 py-12 text-center ring-1 ring-foreground/8",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h2 className="text-base font-medium tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

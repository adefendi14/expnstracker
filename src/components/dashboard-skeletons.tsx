import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-full bg-muted", className)} />;
}

/** Same shell as Debiti/Crediti summary links. */
export function SummaryCardSkeleton() {
  return (
    <div className="w-full rounded-3xl bg-card p-4 ring-1 ring-foreground/8">
      <div className="flex items-start justify-between gap-2">
        <Bone className="size-8 shrink-0 rounded-full" />
        <Bone className="mt-0.5 h-4 w-14 shrink-0" />
      </div>
      <Bone className="mt-3 h-4 w-12" />
      <Bone className="mt-1 h-8 w-[7.5rem] sm:h-9 sm:w-36" />
    </div>
  );
}

/** Same shell as DashboardPiggySection + inner progress rows. */
export function PiggySectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <article className="w-full rounded-3xl bg-card p-5 ring-1 ring-foreground/8">
      <div className="flex items-center justify-between gap-3">
        <Bone className="h-4 w-24" />
        <Bone className="h-9 w-[3.25rem] shrink-0 rounded-full" />
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="w-full">
            <PiggyRowSkeleton />
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PiggyRowSkeleton() {
  return (
    <div className="w-full rounded-2xl bg-muted/50 px-4 py-3 text-left ring-1 ring-transparent">
      <div className="min-w-0">
        <Bone className="h-3.5 w-32 max-w-[60%]" />
        <Bone className="mt-0.5 h-3 w-36 max-w-full" />
      </div>
      <Bone className="mt-2 h-1 w-full rounded-full" />
    </div>
  );
}

/** Same shell as Recenti card + day label + nested transaction rows. */
export function RecentiSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <article className="w-full rounded-3xl bg-card p-5 ring-1 ring-foreground/8">
      <div className="flex items-center justify-between gap-3">
        <Bone className="h-4 w-20" />
        <Bone className="h-9 w-[3.25rem] shrink-0 rounded-full" />
      </div>
      <ul className="mt-4 flex w-full flex-col gap-2">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="w-full">
            <RecentRowSkeleton />
          </li>
        ))}
      </ul>
    </article>
  );
}

export function RecentRowSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3 ring-1 ring-transparent">
      <div className="min-w-0 flex-1">
        <Bone className="h-3.5 w-36 max-w-full" />
        <Bone className="mt-0.5 h-3 w-28 max-w-[80%]" />
      </div>
      <Bone className="h-6 w-[4.5rem] shrink-0 rounded-full" />
    </div>
  );
}

"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ScreenSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 md:px-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="mt-2 h-36 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
      </div>
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-16 w-full rounded-3xl" />
    </div>
  );
}

export function StorageError({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-16 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300">
      <div className="rounded-3xl bg-card px-6 py-10 ring-1 ring-foreground/8">
        <p className="text-sm font-medium text-destructive">Errore</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Dati non disponibili</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98]"
        >
          Azzera dati locali
        </button>
      </div>
    </div>
  );
}

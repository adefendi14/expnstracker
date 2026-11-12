"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Search, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { EnterReveal, FadeSwap, StaggerItem } from "@/components/motion";
import { PrivacyAmount } from "@/components/privacy-amount";
import { Input } from "@/components/ui/input";
import { ScreenSkeleton, StorageError } from "@/components/screen-states";
import { useStore } from "@/lib/store";
import { formatEuro, formatEuroCompact } from "@/lib/format";
import { personInitials, summarizePeople } from "@/lib/people";
import { useMemo, useState } from "react";

export function PeopleScreen() {
  const { status, errorMessage, resetStorage, data } = useStore();
  const [query, setQuery] = useState("");
  const summaries = useMemo(() => summarizePeople(data), [data]);
  const filtered = useMemo(() => {
    const hay = query.trim().toLocaleLowerCase("it-IT");
    if (!hay) return summaries;
    return summaries.filter((item) => item.person.name.toLocaleLowerCase("it-IT").includes(hay));
  }, [query, summaries]);

  if (status === "error") {
    return <StorageError message={errorMessage ?? "Errore di lettura."} onReset={resetStorage} />;
  }

  if (status !== "ready") {
    return <ScreenSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <EnterReveal skeletonClassName="rounded-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Persone</h1>
      </EnterReveal>

      {summaries.length > 0 ? (
        <EnterReveal delay={40} skeletonClassName="rounded-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca"
              className="h-12 rounded-2xl pr-3.5 pl-10"
              autoComplete="off"
            />
          </div>
        </EnterReveal>
      ) : null}

      <FadeSwap id={summaries.length === 0 ? "empty" : filtered.length === 0 ? "miss" : "list"}>
        {summaries.length === 0 ? (
          <EmptyState icon={<Users className="size-5" />} title="Nessun profilo" />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nessun risultato" />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((item, index) => (
              <li key={item.person.id}>
                <StaggerItem index={index}>
                  <Link
                    href={`/persone/scheda?id=${encodeURIComponent(item.person.id)}`}
                    className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-foreground/8 transition-transform duration-150 active:scale-[0.99]"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
                      {personInitials(item.person.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.person.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.creditCount + item.debtCount === 0
                          ? "Niente aperto"
                          : `${item.creditCount} crediti · ${item.debtCount} debiti`}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      {item.openCredits > 0 ? (
                        <p className="inline-flex rounded-full bg-brand/35 px-2 py-0.5 font-medium text-black dark:text-white ring-1 ring-brand/40 backdrop-blur-md">
                          <PrivacyAmount>+{formatEuroCompact(item.openCredits)}</PrivacyAmount>
                        </p>
                      ) : null}
                      {item.openDebts > 0 ? (
                        <p className="font-medium text-brand">
                          <PrivacyAmount>−{formatEuroCompact(item.openDebts)}</PrivacyAmount>
                        </p>
                      ) : null}
                      {item.openCredits === 0 && item.openDebts === 0 ? (
                        <p className="text-muted-foreground">
                          <PrivacyAmount>{formatEuro(0)}</PrivacyAmount>
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </StaggerItem>
              </li>
            ))}
          </ul>
        )}
      </FadeSwap>
    </div>
  );
}

export function RankingRow({
  href,
  name,
  amount,
  tone,
}: {
  href: string;
  name: string;
  amount: number;
  tone: "credit" | "debt";
}) {
  const Icon = tone === "credit" ? ArrowDownLeft : ArrowUpRight;
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center gap-3 py-1.5 transition-opacity hover:opacity-80"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-4" />
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
      <p
        className={
          tone === "credit"
            ? "inline-flex rounded-full bg-brand/35 px-2.5 py-0.5 text-sm font-medium text-black dark:text-white ring-1 ring-brand/40 backdrop-blur-md"
            : "text-sm font-medium text-brand"
        }
      >
        <PrivacyAmount>
          {tone === "credit" ? "+" : "−"}
          {formatEuro(amount)}
        </PrivacyAmount>
      </p>
    </Link>
  );
}

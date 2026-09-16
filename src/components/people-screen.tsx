"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Search, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Persone</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ogni nome in Chi diventa un profilo. Tocca una persona per debiti, crediti e storico.
        </p>
      </div>

      {summaries.length > 0 ? (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca una persona"
            className="h-12 rounded-2xl pr-3.5 pl-10"
            autoComplete="off"
          />
        </div>
      ) : null}

      {summaries.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="Nessun profilo ancora"
          description="Quando salvi un debito o un credito, il nome in Chi diventa una persona. Poi la trovi qui."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nessuna corrispondenza"
          description="Prova un altro nome. I profili si riconoscono anche senza maiuscole."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => (
            <li key={item.person.id}>
              <Link
                href={`/persone/scheda?id=${encodeURIComponent(item.person.id)}`}
                className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-foreground/8"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {personInitials(item.person.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.person.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.creditCount + item.debtCount === 0
                      ? "Nessun debito o credito aperto"
                      : `${item.creditCount} crediti · ${item.debtCount} debiti`}
                  </p>
                </div>
                <div className="text-right text-xs">
                  {item.openCredits > 0 ? (
                    <p className="font-medium text-emerald-700">+{formatEuroCompact(item.openCredits)}</p>
                  ) : null}
                  {item.openDebts > 0 ? (
                    <p className="font-medium text-rose-700">−{formatEuroCompact(item.openDebts)}</p>
                  ) : null}
                  {item.openCredits === 0 && item.openDebts === 0 ? (
                    <p className="text-muted-foreground">{formatEuro(0)}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
    <Link href={href} className="flex min-h-12 items-center gap-3 py-1.5">
      <span
        className={`flex size-8 items-center justify-center rounded-full ${
          tone === "credit" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
        }`}
      >
        <Icon className="size-4" />
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
      <p className={`text-sm font-medium ${tone === "credit" ? "text-emerald-700" : "text-rose-700"}`}>
        {tone === "credit" ? "+" : "−"}
        {formatEuro(amount)}
      </p>
    </Link>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MonthBarsChart, ResidualChart } from "@/components/person-charts";
import { ScreenSkeleton, StorageError } from "@/components/screen-states";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { CATEGORY_LABELS, formatEuro, formatEuroCompact, formatShortDate } from "@/lib/format";
import {
  eventLabel,
  eventsForPerson,
  monthlySeries,
  personInitials,
  residualSeries,
  summarizePeople,
} from "@/lib/people";

export function PersonReport({ personId }: { personId: string }) {
  const { status, errorMessage, resetStorage, data } = useStore();
  const summary = useMemo(
    () => summarizePeople(data).find((item) => item.person.id === personId),
    [data, personId]
  );
  const events = useMemo(() => (summary ? eventsForPerson(data, personId) : []), [data, personId, summary]);
  const months = useMemo(() => monthlySeries(events), [events]);
  const residual = useMemo(() => residualSeries(events), [events]);
  const ledger = data.ledger.filter((item) => item.personId === personId);
  const expenses = data.expenses.filter((item) => item.personId === personId);

  if (status === "error") {
    return <StorageError message={errorMessage ?? "Errore di lettura."} onReset={resetStorage} />;
  }

  if (status !== "ready") {
    return <ScreenSkeleton />;
  }

  if (!summary) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
        <BackLink />
        <EmptyState
          icon={<Users className="size-5" />}
          title="Persona non trovata"
          description="Questo profilo non è nel database di questo account. Torna all’elenco e scegline un altro."
          action={
            <Button nativeButton={false} render={<Link href="/persone" />} className="h-11 rounded-2xl">
              Tutte le persone
            </Button>
          }
        />
      </div>
    );
  }

  const net = summary.openCredits - summary.openDebts;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <BackLink />
      <div className="flex items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {personInitials(summary.person.name)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-semibold tracking-tight">{summary.person.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.creditCount} crediti · {summary.debtCount} debiti · {expenses.length} spese
          </p>
        </div>
      </div>

      <section className="rounded-[1.75rem] bg-card p-6 ring-1 ring-foreground/8">
        <p className="text-sm text-muted-foreground">Saldo con questa persona</p>
        <p className={`mt-2 text-4xl font-semibold tracking-tight ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
          {net >= 0 ? "+" : "−"}
          {formatEuro(Math.abs(net))}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Crediti aperti {formatEuroCompact(summary.openCredits)} − debiti aperti{" "}
          {formatEuroCompact(summary.openDebts)}.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <article className="rounded-3xl bg-card p-4 ring-1 ring-foreground/8">
          <p className="text-xs text-muted-foreground">Ti deve</p>
          <p className="mt-1 text-lg font-semibold text-emerald-700">{formatEuro(summary.openCredits)}</p>
        </article>
        <article className="rounded-3xl bg-card p-4 ring-1 ring-foreground/8">
          <p className="text-xs text-muted-foreground">Devi tu</p>
          <p className="mt-1 text-lg font-semibold text-rose-700">{formatEuro(summary.openDebts)}</p>
        </article>
      </div>

      {summary.expensesTotal > 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          Spese collegate: {formatEuro(summary.expensesTotal)}
        </p>
      ) : null}

      {events.length === 0 ? (
        <EmptyState
          title="Nessuno storico ancora"
          description="I versamenti, i nuovi debiti o crediti e le spese collegate compariranno qui."
        />
      ) : (
        <>
          <MonthBarsChart series={months} />
          <ResidualChart points={residual} />
          <section>
            <h2 className="mb-3 text-sm font-medium">Storico</h2>
            <ol className="flex flex-col gap-2">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/8"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{eventLabel(event.kind)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatShortDate(event.occurredAt)}
                      {event.notes ? ` · ${event.notes}` : ""}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-medium ${
                      event.kind === "credito" || event.kind === "storno"
                        ? "text-emerald-700"
                        : event.kind === "debito" || event.kind === "spesa"
                          ? "text-rose-700"
                          : "text-foreground"
                    }`}
                  >
                    {event.kind === "credito" || event.kind === "storno" ? "+" : event.kind === "versamento" ? "↓" : "−"}
                    {formatEuro(event.amount)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      {ledger.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium">Movimenti aperti e chiusi</h2>
          <ul className="flex flex-col gap-2">
            {ledger.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/elenco?tipo=${item.direction === "debito" ? "debiti" : "crediti"}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/8"
                >
                  <div>
                    <p className="text-sm font-medium">{item.direction === "debito" ? "Debito" : "Credito"}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.settled ? "Saldato" : "Aperto"}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatEuro(item.amount)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {expenses.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium">Spese collegate</h2>
          <ul className="flex flex-col gap-2">
            {expenses.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/8"
              >
                <div>
                  <p className="text-sm font-medium">{item.notes || CATEGORY_LABELS[item.category]}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[item.category]} · {formatShortDate(item.date)}
                  </p>
                </div>
                <p className="text-sm font-medium">{formatEuro(item.amount)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function PersonReportGate() {
  const [personId, setPersonId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPersonId(new URLSearchParams(window.location.search).get("id"));
    setReady(true);
  }, []);

  if (!ready) return <ScreenSkeleton />;
  if (!personId) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
        <BackLink />
        <EmptyState
          title="Manca la persona"
          description="Apri la scheda da Riepilogo o dall’elenco di tutte le persone."
          action={
            <Button nativeButton={false} render={<Link href="/persone" />} className="h-11 rounded-2xl">
              Tutte le persone
            </Button>
          }
        />
      </div>
    );
  }
  return <PersonReport personId={personId} />;
}

function BackLink() {
  return (
    <Link href="/persone" className="inline-flex h-10 items-center gap-1.5 text-sm text-muted-foreground">
      <ArrowLeft className="size-4" />
      Tutte le persone
    </Link>
  );
}

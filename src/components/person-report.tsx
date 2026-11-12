"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { EnterReveal, StaggerItem } from "@/components/motion";
import { MonthBarsChart, ResidualChart } from "@/components/person-charts";
import { PrivacyAmount } from "@/components/privacy-amount";
import { ScreenSkeleton, StorageError } from "@/components/screen-states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import {
  CATEGORY_LABELS,
  formatEuro,
  formatEuroCompact,
  formatShortDate,
  ledgerIsClosed,
  ledgerRemaining,
} from "@/lib/format";
import {
  eventLabel,
  eventsForPerson,
  monthlySeries,
  personInitials,
  residualSeries,
  summarizePeople,
} from "@/lib/people";
import { cn } from "@/lib/utils";

export function PersonReport({ personId }: { personId: string }) {
  const { status, errorMessage, resetStorage, data, renamePerson } = useStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const summary = useMemo(
    () => summarizePeople(data).find((item) => item.person.id === personId),
    [data, personId]
  );
  const events = useMemo(() => (summary ? eventsForPerson(data, personId) : []), [data, personId, summary]);
  const months = useMemo(() => monthlySeries(events), [events]);
  const residual = useMemo(() => residualSeries(events), [events]);
  const ledger = data.ledger.filter(
    (item) => item.personId === personId && !item.relatedLedgerId
  );
  const expenses = data.expenses.filter((item) => item.personId === personId);

  function openEdit() {
    if (!summary) return;
    setEditName(summary.person.name);
    setEditError("");
    setEditing(true);
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      renamePerson(personId, editName);
      toast.success("Persona aggiornata");
      setEditing(false);
      setEditError("");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Modifica non riuscita.");
    }
  }

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
          title="Non trovata"
          action={
            <Button nativeButton={false} render={<Link href="/persone" />} className="h-11 rounded-2xl">
              Persone
            </Button>
          }
        />
      </div>
    );
  }

  const net = summary.openCredits - summary.openDebts;
  const openLedger = ledger.filter((item) => !ledgerIsClosed(item, data.ledger));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <EnterReveal skeletonClassName="rounded-2xl">
        <BackLink />
      </EnterReveal>

      <EnterReveal delay={40} skeletonClassName="rounded-2xl">
        <div className="flex items-center gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-soft-foreground">
            {personInitials(summary.person.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-semibold tracking-tight">{summary.person.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <MetaChip label={`${summary.creditCount} crediti`} />
              <MetaChip label={`${summary.debtCount} debiti`} />
              <MetaChip label={`${expenses.length} spese`} />
            </div>
          </div>
          <button
            type="button"
            onClick={openEdit}
            aria-label="Modifica persona"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
          >
            <Pencil className="size-3.5" />
            Modifica
          </button>
        </div>
      </EnterReveal>

      <Dialog
        open={editing}
        onOpenChange={(open) => {
          setEditing(open);
          if (!open) setEditError("");
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          <form onSubmit={submitEdit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Modifica persona</DialogTitle>
              <DialogDescription>Aggiorna il nome usato in debiti, crediti e spese.</DialogDescription>
            </DialogHeader>
            <Field label="Nome" error={editError}>
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                autoComplete="name"
                className="h-12 rounded-2xl px-3.5"
                autoFocus
              />
            </Field>
            <DialogFooter>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-strong px-4 text-sm font-medium text-brand-foreground"
              >
                Salva
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <EnterReveal delay={80} skeletonClassName="rounded-[1.75rem]">
        <section className="rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/8">
          <p className="text-sm font-medium text-brand">Saldo con {summary.person.name.split(" ")[0]}</p>
          <p
            className={cn(
              "mt-2 text-4xl font-semibold tracking-tight",
              net >= 0 ? "text-foreground" : "text-brand"
            )}
          >
            <PrivacyAmount
              className={
                net >= 0
                  ? "rounded-full bg-brand/35 px-3 py-1 text-black dark:text-white ring-1 ring-brand/40 backdrop-blur-md"
                  : undefined
              }
            >
              {net >= 0 ? "+" : "−"}
              {formatEuro(Math.abs(net))}
            </PrivacyAmount>
          </p>
          {summary.expensesTotal > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Spese insieme · <PrivacyAmount>{formatEuroCompact(summary.expensesTotal)}</PrivacyAmount>
            </p>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-muted/50 px-3.5 py-3 ring-1 ring-transparent">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <ArrowDownLeft className="size-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">Ti deve</p>
              </div>
              <p className="mt-2 text-lg font-semibold tabular-nums">
                <PrivacyAmount
                  className="rounded-full bg-brand/35 px-2.5 py-0.5 text-black dark:text-white ring-1 ring-brand/40 backdrop-blur-md"
                >
                  {formatEuro(summary.openCredits)}
                </PrivacyAmount>
              </p>
            </div>
            <div className="rounded-2xl bg-muted/50 px-3.5 py-3 ring-1 ring-transparent">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <ArrowUpRight className="size-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">Devi tu</p>
              </div>
              <p className="mt-2 text-lg font-semibold tabular-nums text-brand">
                <PrivacyAmount>{formatEuro(summary.openDebts)}</PrivacyAmount>
              </p>
            </div>
          </div>
        </section>
      </EnterReveal>

      {events.length === 0 ? (
        <EnterReveal delay={120}>
          <EmptyState title="Niente storico" />
        </EnterReveal>
      ) : (
        <>
          <EnterReveal delay={120}>
            <MonthBarsChart series={months} />
          </EnterReveal>
          <EnterReveal delay={160}>
            <ResidualChart points={residual} />
          </EnterReveal>
        </>
      )}

      {openLedger.length > 0 ? (
        <EnterReveal delay={200} skeletonClassName="rounded-2xl">
          <section className="rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/8">
            <p className="text-sm font-medium text-brand">Aperti</p>
            <ul className="mt-4 flex flex-col gap-2">
              {openLedger.map((item, index) => {
                const remaining = ledgerRemaining(item, data.ledger);
                const isDebt = item.direction === "debito";
                return (
                  <li key={item.id}>
                    <StaggerItem index={index}>
                      <Link
                        href={`/cronologia/movimento?id=${encodeURIComponent(item.id)}`}
                        className="flex w-full items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3 ring-1 ring-transparent transition hover:bg-muted hover:ring-foreground/8 active:scale-[0.99]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.title || (isDebt ? "Debito" : "Credito")}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {isDebt ? "Debito" : "Credito"}
                            {item.notes ? ` · ${item.notes}` : ""}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "shrink-0 text-sm font-medium tabular-nums",
                            isDebt ? "text-brand" : undefined
                          )}
                        >
                          <PrivacyAmount
                            className={
                              isDebt
                                ? undefined
                                : "rounded-full bg-brand/35 px-2.5 py-0.5 text-black dark:text-white ring-1 ring-brand/40 backdrop-blur-md"
                            }
                          >
                            {isDebt ? "−" : "+"}
                            {formatEuro(remaining)}
                          </PrivacyAmount>
                        </p>
                      </Link>
                    </StaggerItem>
                  </li>
                );
              })}
            </ul>
          </section>
        </EnterReveal>
      ) : null}

      {events.length > 0 ? (
        <EnterReveal delay={240} skeletonClassName="rounded-2xl">
          <section className="rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/8">
            <p className="text-sm font-medium text-brand">Storico</p>
            <ol className="mt-4 flex flex-col gap-2">
              {events.map((event, index) => {
                const positive = event.kind === "credito" || event.kind === "storno";
                const negative = event.kind === "debito" || event.kind === "spesa";
                return (
                  <li key={event.id}>
                    <StaggerItem index={index}>
                      <div className="flex items-start justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{eventLabel(event.kind)}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatShortDate(event.occurredAt)}
                            {event.notes ? ` · ${event.notes}` : ""}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "shrink-0 text-sm font-medium tabular-nums",
                            negative ? "text-brand" : positive ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          <PrivacyAmount
                            className={
                              positive
                                ? "rounded-full bg-brand/35 px-2.5 py-0.5 text-black dark:text-white ring-1 ring-brand/40 backdrop-blur-md"
                                : undefined
                            }
                          >
                            {positive ? "+" : event.kind === "versamento" ? "↓" : "−"}
                            {formatEuro(event.amount)}
                          </PrivacyAmount>
                        </p>
                      </div>
                    </StaggerItem>
                  </li>
                );
              })}
            </ol>
          </section>
        </EnterReveal>
      ) : null}

      {expenses.length > 0 ? (
        <EnterReveal delay={280} skeletonClassName="rounded-2xl">
          <section className="rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/8">
            <p className="text-sm font-medium text-brand">Spese</p>
            <ul className="mt-4 flex flex-col gap-2">
              {expenses.map((item, index) => (
                <li key={item.id}>
                  <StaggerItem index={index}>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.notes || CATEGORY_LABELS[item.category]}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {CATEGORY_LABELS[item.category]} · {formatShortDate(item.date)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums text-brand">
                        <PrivacyAmount>−{formatEuro(item.amount)}</PrivacyAmount>
                      </p>
                    </div>
                  </StaggerItem>
                </li>
              ))}
            </ul>
          </section>
        </EnterReveal>
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
          title="Persona mancante"
          action={
            <Button nativeButton={false} render={<Link href="/persone" />} className="h-11 rounded-2xl">
              Persone
            </Button>
          }
        />
      </div>
    );
  }
  return <PersonReport personId={personId} />;
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-muted px-2.5 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function BackLink() {
  return (
    <Link
      href="/persone"
      className="inline-flex h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Persone
    </Link>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCheck,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useCloseCelebration } from "@/components/close-celebration";
import { EnterReveal } from "@/components/motion";
import { PrivacyAmount } from "@/components/privacy-amount";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { LedgerEditDialog } from "@/components/item-edit-dialogs";
import { ScreenSkeleton, StorageError } from "@/components/screen-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import {
  associatedPrincipals,
  formatEuro,
  formatEuroCompact,
  formatShortDate,
  isLedgerPayment,
  ledgerIsClosed,
  ledgerPaid,
  ledgerRemaining,
  parseEuroInput,
} from "@/lib/format";
import { eventLabel } from "@/lib/people";
import { cn } from "@/lib/utils";
import type { PersonEvent } from "@/lib/types";

type AdjustMode = "aggiungi" | "togli";

const inputClass = "h-12 rounded-2xl px-3.5";

function historyLabel(event: PersonEvent) {
  if (event.kind === "obiettivo") return "Quantità modificata";
  if (event.kind === "versamento") return "Tolto dal residuo";
  if (event.kind === "storno") return "Storno versamento";
  if (event.kind === "apertura") return "Riapertura";
  if (event.kind === "chiusura") return "Chiusura";
  if (event.kind === "estinzione") return "Estinzione";
  return eventLabel(event.kind);
}

function historySign(event: PersonEvent) {
  if (event.kind === "versamento" || event.kind === "estinzione" || event.kind === "chiusura") return "−";
  if (event.kind === "storno" || event.kind === "obiettivo" || event.kind === "apertura") return "+";
  return "";
}

export function LedgerDetailScreen({ ledgerId }: { ledgerId: string }) {
  const router = useRouter();
  const store = useStore();
  const { celebrateClose } = useCloseCelebration();
  const requested = store.data.ledger.find((item) => item.id === ledgerId);
  const live = requested
    ? isLedgerPayment(requested)
      ? store.data.ledger.find((item) => item.id === requested.relatedLedgerId) ?? requested
      : requested
    : undefined;
  const [mode, setMode] = useState<AdjustMode>("aggiungi");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const linkedIds = useMemo(() => {
    if (!live) return new Set<string>();
    return new Set(
      store.data.ledger
        .filter((item) => item.relatedLedgerId === live.id)
        .map((item) => item.id)
        .concat(live.id)
    );
  }, [store.data.ledger, live]);

  const history = useMemo(
    () =>
      store.data.events
        .filter((event) => event.ledgerId && linkedIds.has(event.ledgerId))
        .slice()
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [store.data.events, linkedIds]
  );

  const associates = useMemo(
    () => (live ? associatedPrincipals(live, store.data.ledger) : []),
    [live, store.data.ledger]
  );

  if (!live || isLedgerPayment(live)) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
        <EmptyState
          title="Movimento non trovato"
          action={
            <Button nativeButton={false} render={<Link href="/cronologia" />} className="h-11 rounded-2xl" variant="brand">
              Torna alla cronologia
            </Button>
          }
        />
      </div>
    );
  }

  const paid = ledgerPaid(live, store.data.ledger);
  const remaining = ledgerRemaining(live, store.data.ledger);
  const closed = ledgerIsClosed(live, store.data.ledger);
  const isDebt = live.direction === "debito";

  function applyAdjust() {
    const parsed = parseEuroInput(amount);
    if (parsed === null || parsed === 0) {
      setError("Inserisci un importo valido.");
      return;
    }

    if (mode === "aggiungi") {
      store.adjustLedgerTarget(live!.id, parsed);
      toast.success(closed ? "Riaperta con aumento" : "Quantità aumentata");
    } else {
      if (parsed > remaining) {
        setError(`Puoi togliere al massimo ${formatEuro(remaining)}.`);
        return;
      }
      const closes = Math.abs(remaining - parsed) < 0.001;
      store.adjustLedgerPaid(live!.id, parsed);
      if (closes) {
        celebrateClose(isDebt ? "debito" : "credito");
      } else {
        toast.success("Residuo aggiornato");
      }
    }

    setAmount("");
    setError("");
  }

  function applyExtinguish() {
    if (remaining <= 0) {
      toast.message("Già estinto");
      return;
    }
    store.extinguishLedger(live!.id);
    celebrateClose(isDebt ? "debito" : "credito");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 md:gap-5 md:px-8 md:py-6">
      <EnterReveal skeletonClassName="rounded-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/cronologia"
            className="inline-flex h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Cronologia
          </Link>
          <button
            type="button"
            aria-label="Elimina"
            onClick={() => {
              store.deleteLedger(live.id);
              toast.success("Eliminato");
              router.push("/cronologia");
            }}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </EnterReveal>

      <EnterReveal delay={40} skeletonClassName="rounded-2xl">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            {isDebt ? <ArrowUpRight className="size-5" /> : <ArrowDownLeft className="size-5" />}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{live.title}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {live.person} · {isDebt ? "Debito" : "Credito"}
              {closed ? " · chiuso" : " · aperto"}
              {live.dueDate ? ` · scad. ${formatShortDate(live.dueDate)}` : ""}
            </p>
          </div>
        </div>
      </EnterReveal>

      <EnterReveal delay={80}>
        <section className="rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/8">
          <p className="text-sm font-medium text-brand">Residuo</p>
          <p
            className={cn(
              "mt-2 text-4xl font-semibold tracking-tight",
              isDebt ? "text-brand" : "text-white"
            )}
          >
            <PrivacyAmount
              className={
                isDebt
                  ? undefined
                  : "rounded-full bg-brand/35 px-3 py-1 ring-1 ring-brand/40 backdrop-blur-md"
              }
            >
              {isDebt ? "−" : "+"}
              {formatEuro(remaining)}
            </PrivacyAmount>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Quantità</p>
              <p className="mt-1 font-medium">
                <PrivacyAmount>{formatEuroCompact(live.amount)}</PrivacyAmount>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Già scalato</p>
              <p className="mt-1 font-medium">
                <PrivacyAmount>{formatEuroCompact(paid)}</PrivacyAmount>
              </p>
            </div>
          </div>
          {live.notes ? <p className="mt-4 text-sm text-muted-foreground">{live.notes}</p> : null}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {live.personId ? (
              <Link
                href={`/persone/scheda?id=${encodeURIComponent(live.personId)}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted/70 px-2.5 text-xs font-medium text-muted-foreground ring-1 ring-foreground/8 transition hover:bg-muted hover:text-foreground"
              >
                <UserRound className="size-3.5 shrink-0 text-brand" />
                <span className="max-w-[9rem] truncate">Scheda di {live.person}</span>
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted/70 px-2.5 text-xs font-medium text-muted-foreground ring-1 ring-foreground/8 transition hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5 shrink-0 text-brand" />
              Modifica
            </button>
            {closed ? (
              <button
                type="button"
                onClick={() => {
                  store.reopenLedger(live.id);
                  toast.success("Riaperta");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted/70 px-2.5 text-xs font-medium text-muted-foreground ring-1 ring-foreground/8 transition hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="size-3.5 shrink-0 text-brand" />
                Riapri
              </button>
            ) : null}
          </div>
        </section>
      </EnterReveal>

      <EnterReveal delay={110} skeletonClassName="rounded-3xl">
        <section className="rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/8">
          <p className="text-sm font-medium text-brand">Operazioni</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("aggiungi");
                setError("");
              }}
              className={cn(
                "rounded-2xl px-3 py-3 text-left ring-1 transition-[background-color,color,box-shadow] duration-200",
                mode === "aggiungi"
                  ? "bg-brand/40 text-white ring-brand/55 backdrop-blur-md"
                  : "bg-muted/60 text-muted-foreground ring-foreground/8 hover:bg-muted"
              )}
              aria-pressed={mode === "aggiungi"}
            >
              <Plus className="mb-2 size-4" />
              <p className="text-sm font-semibold">Aggiungi</p>
              <p className={cn("mt-0.5 text-[11px]", mode === "aggiungi" ? "text-white/75" : "text-muted-foreground")}>
                {closed ? "Riapre e alza quantità" : "Alza quantità"}
              </p>
            </button>
            <button
              type="button"
              disabled={remaining <= 0}
              onClick={() => {
                setMode("togli");
                setError("");
              }}
              className={cn(
                "rounded-2xl px-3 py-3 text-left ring-1 transition-[background-color,color,box-shadow] duration-200 disabled:opacity-40",
                mode === "togli"
                  ? "bg-brand/40 text-white ring-brand/55 backdrop-blur-md"
                  : "bg-muted/60 text-muted-foreground ring-foreground/8 hover:bg-muted"
              )}
              aria-pressed={mode === "togli"}
            >
              <Minus className="mb-2 size-4" />
              <p className="text-sm font-semibold">Togli</p>
              <p className={cn("mt-0.5 text-[11px]", mode === "togli" ? "text-white/75" : "text-muted-foreground")}>
                Riduce il residuo
              </p>
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <Field label="Importo" error={error}>
              <Input
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={applyAdjust}
                className="inline-flex h-12 min-w-0 items-center justify-center rounded-2xl bg-brand-strong px-3 text-sm font-semibold text-brand-foreground transition-transform active:scale-[0.98]"
              >
                Conferma
              </button>
              <button
                type="button"
                disabled={remaining <= 0}
                onClick={applyExtinguish}
                className="inline-flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl bg-muted px-2.5 text-sm font-semibold text-foreground ring-1 ring-foreground/8 transition-transform enabled:active:scale-[0.98] disabled:opacity-40"
              >
                <CheckCheck className="size-4 shrink-0 text-brand" />
                <span className="truncate">Estingui</span>
                {remaining > 0 ? (
                  <span className="truncate text-muted-foreground">
                    · <PrivacyAmount>{formatEuroCompact(remaining)}</PrivacyAmount>
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </section>
      </EnterReveal>

      {associates.length > 0 ? (
        <EnterReveal delay={140} skeletonClassName="rounded-2xl">
          <section>
            <h2 className="mb-3 text-sm font-medium text-brand">Associati</h2>
            <ul className="flex flex-col gap-2">
              {associates.map((item) => {
                const itemClosed = ledgerIsClosed(item, store.data.ledger);
                const itemRemaining = ledgerRemaining(item, store.data.ledger);
                return (
                  <li key={item.id}>
                    <Link
                      href={`/cronologia/movimento?id=${encodeURIComponent(item.id)}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/8 transition-transform active:scale-[0.99]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.person} · {item.direction === "debito" ? "Debito" : "Credito"}
                          {itemClosed ? " · chiuso" : ""}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-brand">
                        <PrivacyAmount>
                          {item.direction === "debito" ? "−" : "+"}
                          {formatEuro(itemRemaining)}
                        </PrivacyAmount>
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </EnterReveal>
      ) : null}

      <EnterReveal delay={170} skeletonClassName="rounded-2xl">
        <section>
          <h2 className="mb-3 text-sm font-medium text-brand">Cronologia stato</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna modifica ancora.</p>
          ) : (
            <ol className="relative ml-2 flex flex-col gap-0 border-l border-brand/35 pl-5">
              {history.map((event) => (
                <li key={event.id} className="relative py-3">
                  <span className="absolute top-4 -left-[1.4rem] size-2.5 rounded-full bg-brand ring-4 ring-background" />
                  <div className="flex items-start justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/8">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{historyLabel(event)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatShortDate(event.occurredAt)}
                        {event.notes ? ` · ${event.notes}` : ""}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-sm font-medium",
                        event.kind === "estinzione" || event.kind === "chiusura" || event.kind === "versamento"
                          ? "text-brand"
                          : event.kind === "apertura" || event.kind === "obiettivo"
                            ? "inline-flex rounded-full bg-brand/35 px-2.5 py-0.5 text-black dark:text-white ring-1 ring-brand/40 backdrop-blur-md"
                            : "text-foreground"
                      )}
                    >
                      <PrivacyAmount>
                        {historySign(event)}
                        {formatEuro(event.amount)}
                      </PrivacyAmount>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </EnterReveal>

      <LedgerEditDialog item={live} open={editing} onOpenChange={setEditing} />
    </div>
  );
}

export function LedgerDetailGate() {
  const { status, errorMessage, resetStorage } = useStore();
  const [ledgerId, setLedgerId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLedgerId(new URLSearchParams(window.location.search).get("id"));
    setReady(true);
  }, []);

  if (status === "error") {
    return <StorageError message={errorMessage ?? "Errore di lettura."} onReset={resetStorage} />;
  }
  if (status !== "ready" || !ready) {
    return <ScreenSkeleton />;
  }
  if (!ledgerId) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
        <EmptyState
          title="Movimento non trovato"
          action={
            <Button nativeButton={false} render={<Link href="/cronologia" />} className="h-11 rounded-2xl" variant="brand">
              Torna alla cronologia
            </Button>
          }
        />
      </div>
    );
  }
  return <LedgerDetailScreen ledgerId={ledgerId} />;
}

"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cronologiaHref } from "@/lib/cronologia-query";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Lightbulb, Receipt, Scale, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCloseCelebration } from "@/components/close-celebration";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { ExpenseEditDialog, IdeaEditDialog, LedgerEditDialog } from "@/components/item-edit-dialogs";
import { EnterReveal, FadeSwap, StaggerItem } from "@/components/motion";
import { PrivacyAmount } from "@/components/privacy-amount";
import { useStore } from "@/lib/store";
import {
  CATEGORY_ACCENT,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  RISK_LABELS,
  dayKeyFromIso,
  formatDayHeading,
  formatEuro,
  formatEuroCompact,
  formatShortDate,
  isLedgerPayment,
  ledgerIsClosed,
  ledgerPaid,
  ledgerRemaining,
  parseEuroInput,
} from "@/lib/format";
import type {
  Expense,
  InvestmentIdea,
  LedgerEntry,
  ListKind,
  StatusFilter,
} from "@/lib/types";

type Row =
  | { kind: "ledger"; item: LedgerEntry }
  | { kind: "expense"; item: Expense }
  | { kind: "idea"; item: InvestmentIdea };

function stamp(row: Row) {
  return row.item.updatedAt || row.item.createdAt;
}

const inputClass = "h-12 rounded-2xl px-3.5";

function LedgerAdjustDialog({
  item,
  open,
  onOpenChange,
  onEdit,
}: {
  item: LedgerEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  const store = useStore();
  const { celebrateClose } = useCloseCelebration();
  const live = store.data.ledger.find((entry) => entry.id === item.id) ?? item;
  const [mode, setMode] = useState<"versa" | "obiettivo">("versa");
  const [error, setError] = useState("");
  const remaining = ledgerRemaining(live, store.data.ledger);
  const paid = ledgerPaid(live, store.data.ledger);
  const isDebt = live.direction === "debito";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseEuroInput(String(new FormData(event.currentTarget).get("amount") ?? ""));
    if (parsed === null || parsed === 0) {
      setError("Inserisci un importo valido.");
      return;
    }
    if (mode === "versa") {
      if (parsed > remaining && remaining > 0) {
        setError(`Puoi versare al massimo ${formatEuro(remaining)}.`);
        return;
      }
      if (remaining === 0 && !live.settled) {
        setError("Alza prima l’obiettivo, poi versa.");
        return;
      }
      const closes = remaining > 0 && Math.abs(remaining - parsed) < 0.001;
      store.adjustLedgerPaid(live.id, parsed);
      if (closes) celebrateClose(isDebt ? "debito" : "credito");
      else toast.success(isDebt ? "Versamento sul debito" : "Versamento sul credito");
    } else {
      store.adjustLedgerTarget(live.id, parsed);
      toast.success("Obiettivo aumentato");
    }
    setError("");
    onOpenChange(false);
  }

  const title =
    mode === "obiettivo" ? "Aumenta obiettivo" : isDebt ? "Versa sul debito" : "Versa sul credito";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setError("");
          setMode("versa");
        }
      }}
    >
      <DialogContent className="rounded-3xl sm:max-w-md">
        <form key={open ? "open" : "closed"} onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {live.person} ·{" "}
              <PrivacyAmount>
                {mode === "obiettivo"
                  ? `${formatEuroCompact(live.amount)} / ${formatEuroCompact(paid)}`
                  : formatEuroCompact(remaining)}
              </PrivacyAmount>
              {live.dueDate ? ` · ${formatShortDate(live.dueDate)}` : ""}
              {live.settled ? " · saldato" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "versa" ? "default" : "outline"}
              className="h-11 rounded-2xl"
              onClick={() => {
                setMode("versa");
                setError("");
              }}
            >
              Versa
            </Button>
            <Button
              type="button"
              variant={mode === "obiettivo" ? "default" : "outline"}
              className="h-11 rounded-2xl"
              onClick={() => {
                setMode("obiettivo");
                setError("");
              }}
            >
              Aumenta obiettivo
            </Button>
          </div>
          <Field label="Importo" error={error}>
            <Input
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              className={inputClass}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
            {live.personId ? (
              <Link
                href={`/persone/scheda?id=${encodeURIComponent(live.personId)}`}
                className="text-muted-foreground hover:text-foreground"
              >
                Scheda di {live.person}
              </Link>
            ) : null}
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onEdit}>
              Modifica
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                const closed = remaining <= 0;
                store.updateLedger(live.id, { settled: !closed });
                if (closed) {
                  toast.success("Riaperta");
                } else {
                  celebrateClose(isDebt ? "debito" : "credito");
                }
                onOpenChange(false);
              }}
            >
              {remaining <= 0 ? "Riapri" : "Segna come saldato"}
            </button>
            <button
              type="button"
              className="text-destructive hover:text-destructive/80"
              onClick={() => {
                store.deleteLedger(live.id);
                toast.success("Eliminato");
                onOpenChange(false);
              }}
            >
              Elimina
            </button>
          </div>
          <DialogFooter>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-strong px-4 text-sm font-medium text-brand-foreground"
            >
              Conferma
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ListsScreen({
  initialKind = "tutti",
  initialStatus = "tutti",
}: {
  initialKind?: ListKind;
  initialStatus?: StatusFilter;
}) {
  const router = useRouter();
  const store = useStore();
  const { celebrateClose } = useCloseCelebration();
  const [kind, setKind] = useState<ListKind>(initialKind);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftKind, setDraftKind] = useState<ListKind>(initialKind);
  const advancedActive = kind !== "tutti";

  useEffect(() => {
    setKind(initialKind);
    setStatus(initialStatus);
    setDraftKind(initialKind);
  }, [initialKind, initialStatus]);

  const kindOptions: { value: ListKind; label: string }[] = [
    { value: "tutti", label: "Tutti" },
    { value: "debiti", label: "Debiti" },
    { value: "crediti", label: "Crediti" },
    { value: "spese", label: "Spese" },
    { value: "idee", label: "Idee" },
  ];

  const openCounts = useMemo(() => {
    const open = store.data.ledger.filter(
      (item) => !isLedgerPayment(item) && !ledgerIsClosed(item, store.data.ledger)
    );
    return {
      debiti: open.filter((item) => item.direction === "debito").length,
      crediti: open.filter((item) => item.direction === "credito").length,
    };
  }, [store.data.ledger]);

  const rows = useMemo(() => {
    const all: Row[] = [
      ...store.data.ledger.map((item) => ({ kind: "ledger" as const, item })),
      ...store.data.expenses.map((item) => ({ kind: "expense" as const, item })),
      ...store.data.ideas.map((item) => ({ kind: "idea" as const, item })),
    ].sort((a, b) => stamp(b).localeCompare(stamp(a)));

    return all.filter((row) => {
      if (kind === "debiti" && (row.kind !== "ledger" || row.item.direction !== "debito")) return false;
      if (kind === "crediti" && (row.kind !== "ledger" || row.item.direction !== "credito")) return false;
      if (kind === "spese" && row.kind !== "expense") return false;
      if (kind === "idee" && row.kind !== "idea") return false;

      if (status !== "tutti") {
        const closed =
          row.kind === "ledger"
            ? ledgerIsClosed(row.item, store.data.ledger)
            : row.kind === "idea" || row.kind === "expense"
              ? row.item.completed
              : false;
        if (status === "aperti" && closed) return false;
        if (status === "chiusi" && !closed) return false;
      }

      if (!query.trim()) return true;
      const hay = query.trim().toLowerCase();
      if (row.kind === "ledger") {
        return `${row.item.person} ${row.item.notes ?? ""}`.toLowerCase().includes(hay);
      }
      if (row.kind === "expense") {
        const personName = store.data.people.find((person) => person.id === row.item.personId)?.name ?? "";
        return `${CATEGORY_LABELS[row.item.category]} ${row.item.notes ?? ""} ${personName}`.toLowerCase().includes(hay);
      }
      return `${row.item.title} ${row.item.notes ?? ""} ${row.item.link ?? ""}`.toLowerCase().includes(hay);
    });
  }, [store.data, kind, status, query]);

  function closePanels() {
    setSelected(null);
    setEditing(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div className="grid grid-cols-2 gap-3">
        <EnterReveal skeletonClassName="rounded-3xl">
          <button
            type="button"
            aria-pressed={kind === "debiti"}
            onClick={() => {
              router.replace(
                kind === "debiti"
                  ? cronologiaHref("tutti", "tutti")
                  : cronologiaHref("debiti", "aperti")
              );
            }}
            className={cn(
              "w-full rounded-3xl bg-card p-4 text-left ring-1 transition-[box-shadow,background-color] duration-200",
              kind === "debiti" ? "ring-brand/50 bg-brand/10" : "ring-foreground/8"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                <ArrowUpRight className="size-4" />
              </div>
              <p className="pt-0.5 text-right text-xs font-medium tabular-nums text-muted-foreground">
                {openCounts.debiti} {openCounts.debiti === 1 ? "aperto" : "aperti"}
              </p>
            </div>
            <p className="mt-3 text-xs font-medium text-brand">Debiti</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              <PrivacyAmount>{formatEuro(store.totals.openDebts)}</PrivacyAmount>
            </p>
          </button>
        </EnterReveal>
        <EnterReveal delay={40} skeletonClassName="rounded-3xl">
          <button
            type="button"
            aria-pressed={kind === "crediti"}
            onClick={() => {
              router.replace(
                kind === "crediti"
                  ? cronologiaHref("tutti", "tutti")
                  : cronologiaHref("crediti", "aperti")
              );
            }}
            className={cn(
              "w-full rounded-3xl bg-card p-4 text-left ring-1 transition-[box-shadow,background-color] duration-200",
              kind === "crediti" ? "ring-brand/50 bg-brand/10" : "ring-foreground/8"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                <ArrowDownLeft className="size-4" />
              </div>
              <p className="pt-0.5 text-right text-xs font-medium tabular-nums text-muted-foreground">
                {openCounts.crediti} {openCounts.crediti === 1 ? "aperto" : "aperti"}
              </p>
            </div>
            <p className="mt-3 text-xs font-medium text-brand">Crediti</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              <PrivacyAmount>{formatEuro(store.totals.openCredits)}</PrivacyAmount>
            </p>
          </button>
        </EnterReveal>
      </div>

      <EnterReveal delay={60} skeletonClassName="rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca"
              className="h-9 rounded-full py-0 pl-9 text-sm md:text-sm"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {(["aperti", "chiusi", "tutti"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => router.replace(cronologiaHref(kind, value))}
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-3 text-xs font-medium transition-colors duration-200",
                  status === value
                    ? "bg-brand-strong text-brand-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {value === "aperti" ? "Aperti" : value === "chiusi" ? "Chiusi" : "Tutti"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-label="Filtri avanzati"
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                advancedActive
                  ? "bg-brand-strong text-brand-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </EnterReveal>

      <Dialog
        open={filtersOpen}
        onOpenChange={(open) => {
          setFiltersOpen(open);
          if (open) setDraftKind(kind);
        }}
      >
        <DialogContent className="gap-3 rounded-3xl p-4 sm:max-w-sm">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-base">Filtri avanzati</DialogTitle>
            <DialogDescription className="text-xs">
              Tipo di movimento da mostrare in cronologia.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {kindOptions.map((option) => {
              const active = draftKind === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDraftKind(option.value)}
                  className={cn(
                    "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-brand-strong text-brand-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-4"
              onClick={() => setDraftKind("tutti")}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="brand"
              className="h-9 rounded-full px-4"
              onClick={() => {
                setFiltersOpen(false);
                router.replace(cronologiaHref(draftKind, status));
              }}
            >
              Applica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FadeSwap id={`${kind}-${status}-${query.trim() ? "q" : "all"}`}>
      {rows.length === 0 ? (
        <EmptyState
          icon={
            kind === "idee" ? (
              <Lightbulb className="size-5" />
            ) : kind === "spese" ? (
              <Receipt className="size-5" />
            ) : (
              <Scale className="size-5" />
            )
          }
          title={query ? "Nessun risultato" : "Vuoto"}
          action={
            <Button
              variant="brand"
              nativeButton={false}
              render={<Link href="/aggiungi" />}
              className="h-11 rounded-2xl"
            >
              Aggiungi
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const day = dayKeyFromIso(stamp(row));
            const previous = index > 0 ? dayKeyFromIso(stamp(rows[index - 1]!)) : null;
            const showDay = day !== previous;
            return (
              <li key={`${row.kind}-${row.item.id}`} className={showDay && index > 0 ? "mt-3" : undefined}>
                {showDay ? (
                  <p className="mb-2 px-1 text-xs font-medium text-brand">{formatDayHeading(stamp(row))}</p>
                ) : null}
                <StaggerItem index={index}>
                  <button
                    type="button"
                    onClick={() => {
                      if (row.kind === "ledger") {
                        const targetId = row.item.relatedLedgerId ?? row.item.id;
                        router.push(`/cronologia/movimento?id=${encodeURIComponent(targetId)}`);
                        return;
                      }
                      setEditing(false);
                      setSelected(row);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left ring-1 ring-foreground/8 transition-transform duration-150 active:scale-[0.99]"
                  >
                    <RowPreview row={row} people={store.data.people} ledger={store.data.ledger} />
                  </button>
                </StaggerItem>
              </li>
            );
          })}
        </ul>
      )}
      </FadeSwap>

      {selected?.kind === "ledger" ? (
        <>
          <LedgerAdjustDialog
            item={selected.item}
            open={!editing}
            onOpenChange={(open) => {
              if (!open && !editing) setSelected(null);
            }}
            onEdit={() => setEditing(true)}
          />
          <LedgerEditDialog
            key={selected.item.id}
            item={selected.item}
            open={editing}
            onOpenChange={(open) => {
              if (!open) closePanels();
            }}
          />
        </>
      ) : (
        <>
        <Sheet
          open={Boolean(selected) && !editing}
          onOpenChange={(open) => {
            if (!open && !editing) setSelected(null);
          }}
        >
          <SheetContent side="bottom" className="rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {selected ? (
              <>
                <SheetHeader>
                  <SheetTitle>
                    {selected.kind === "expense"
                      ? CATEGORY_LABELS[selected.item.category]
                      : selected.item.title}
                  </SheetTitle>
                  <SheetDescription>
                    {selected.kind === "expense" ? "Spesa" : "Idea"}
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-3 px-4 text-sm">
                  <p className="text-2xl font-semibold tracking-tight">
                    <PrivacyAmount>{formatEuro(selected.item.amount)}</PrivacyAmount>
                  </p>
                  {selected.kind === "expense" ? (
                    <>
                      <p className="text-muted-foreground">{formatShortDate(selected.item.date)}</p>
                      <p className={selected.item.completed ? "text-brand" : "text-muted-foreground"}>
                        {selected.item.completed ? "Chiusa" : "Aperta"}
                      </p>
                    </>
                  ) : null}
                  {selected.kind === "idea" ? (
                    <>
                      <p className="text-muted-foreground">
                        {selected.item.amountKind === "stimato" ? "Stimato" : "Attuale"} ·{" "}
                        {PRIORITY_LABELS[selected.item.priority]} · {RISK_LABELS[selected.item.risk]}
                      </p>
                      {selected.item.link ? (
                        <a
                          href={selected.item.link}
                          className="text-foreground underline underline-offset-4"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Apri link
                        </a>
                      ) : null}
                      <p className={selected.item.completed ? "text-brand" : "text-muted-foreground"}>
                        {selected.item.completed ? "Completata" : "Aperta"}
                      </p>
                    </>
                  ) : null}
                  {selected.item.notes ? <p>{selected.item.notes}</p> : null}
                </div>
                <SheetFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    className="h-11 rounded-2xl"
                    variant="outline"
                    onClick={() => setEditing(true)}
                  >
                    Modifica
                  </Button>
                  {selected.kind === "expense" ? (
                    <Button
                      className="h-11 rounded-2xl"
                      onClick={() => {
                        const closing = !selected.item.completed;
                        store.updateExpense(selected.item.id, { completed: closing });
                        if (closing) celebrateClose("spesa");
                        else toast.success("Spesa riaperta");
                        setSelected(null);
                      }}
                    >
                      {selected.item.completed ? "Riapri" : "Chiudi spesa"}
                    </Button>
                  ) : null}
                  {selected.kind === "idea" ? (
                    <Button
                      className="h-11 rounded-2xl"
                      onClick={() => {
                        const closing = !selected.item.completed;
                        store.updateIdea(selected.item.id, { completed: closing });
                        if (closing) celebrateClose("idea");
                        else toast.success("Idea riaperta");
                        setSelected(null);
                      }}
                    >
                      {selected.item.completed ? "Riapri" : "Segna come completata"}
                    </Button>
                  ) : null}
                  <Button
                    className="h-11 rounded-2xl sm:col-span-2"
                    variant="destructive"
                    onClick={() => {
                      if (selected.kind === "expense") store.deleteExpense(selected.item.id);
                      if (selected.kind === "idea") store.deleteIdea(selected.item.id);
                      toast.success("Eliminato");
                      setSelected(null);
                    }}
                  >
                    Elimina
                  </Button>
                </SheetFooter>
              </>
            ) : null}
          </SheetContent>
        </Sheet>
        {selected?.kind === "expense" ? (
          <ExpenseEditDialog
            key={selected.item.id}
            item={selected.item}
            open={editing}
            onOpenChange={(open) => {
              if (!open) closePanels();
            }}
          />
        ) : null}
        {selected?.kind === "idea" ? (
          <IdeaEditDialog
            key={selected.item.id}
            item={selected.item}
            open={editing}
            onOpenChange={(open) => {
              if (!open) closePanels();
            }}
          />
        ) : null}
        </>
      )}
    </div>
  );
}

function RowPreview({
  row,
  people,
  ledger,
}: {
  row: Row;
  people: { id: string; name: string }[];
  ledger: LedgerEntry[];
}) {
  if (row.kind === "ledger") {
    if (isLedgerPayment(row.item)) {
      const label =
        row.item.notes === "Estinzione"
          ? "Estinzione"
          : row.item.amount < 0
            ? "Storno"
            : row.item.notes === "Versamento a saldo"
              ? "Versamento a saldo"
              : "Versamento";
      return (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{row.item.title || label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {row.item.person} · {label}
            </p>
          </div>
          <p className="text-sm font-medium text-brand">
            <PrivacyAmount>
              {row.item.amount < 0 ? "+" : "−"}
              {formatEuro(Math.abs(row.item.amount))}
            </PrivacyAmount>
          </p>
        </>
      );
    }

    const closed = ledgerIsClosed(row.item, ledger);
    return (
      <>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{row.item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.item.person} · {row.item.direction === "debito" ? "Debito" : "Credito"}
            {row.item.dueDate ? ` · ${formatShortDate(row.item.dueDate)}` : ""}
            {closed ? " · chiuso" : ""}
          </p>
        </div>
        <p
          className={
            row.item.direction === "debito"
              ? "text-sm font-medium text-brand"
              : "inline-flex rounded-full bg-brand/35 px-2.5 py-0.5 text-sm font-medium text-black dark:text-white ring-1 ring-brand/40 backdrop-blur-md"
          }
        >
          <PrivacyAmount>
            {row.item.direction === "debito" ? "−" : "+"}
            {formatEuro(row.item.amount)}
          </PrivacyAmount>
        </p>
      </>
    );
  }

  if (row.kind === "expense") {
    const personName = people.find((person) => person.id === row.item.personId)?.name;
    return (
      <>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{row.item.notes || CATEGORY_LABELS[row.item.category]}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge className={CATEGORY_ACCENT[row.item.category]} variant="secondary">
              {CATEGORY_LABELS[row.item.category]}
            </Badge>
            {formatShortDate(row.item.date)}
            {personName ? ` · ${personName}` : ""}
            {row.item.completed ? " · chiusa" : ""}
          </p>
        </div>
        <p className="text-sm font-medium">
          <PrivacyAmount>{formatEuro(row.item.amount)}</PrivacyAmount>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{row.item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.item.amountKind === "stimato" ? "Stimato" : "Attuale"} · {PRIORITY_LABELS[row.item.priority]} ·{" "}
          {RISK_LABELS[row.item.risk]}
          {row.item.completed ? " · chiusa" : ""}
        </p>
      </div>
      <p className="text-sm font-medium">
        <PrivacyAmount>{formatEuro(row.item.amount)}</PrivacyAmount>
      </p>
    </>
  );
}

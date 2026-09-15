"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lightbulb, Receipt, Scale, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { SegmentedControl } from "@/components/segmented-control";
import { useStore } from "@/lib/store";
import {
  CATEGORY_ACCENT,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  RISK_LABELS,
  formatEuro,
  formatEuroCompact,
  formatShortDate,
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
  const live = store.data.ledger.find((entry) => entry.id === item.id) ?? item;
  const [mode, setMode] = useState<"versa" | "obiettivo">("versa");
  const [error, setError] = useState("");
  const remaining = ledgerRemaining(live);
  const paid = ledgerPaid(live);
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
      store.adjustLedgerPaid(live.id, parsed);
      toast.success(isDebt ? "Versamento sul debito" : "Versamento sul credito");
    } else {
      store.adjustLedgerTarget(live.id, parsed);
      toast.success("Obiettivo aumentato");
    }
    setError("");
    onOpenChange(false);
  }

  const title =
    mode === "obiettivo" ? "Aumenta obiettivo" : isDebt ? "Versa sul debito" : "Versa sul credito";
  const description =
    mode === "obiettivo"
      ? `«${live.person}». Obiettivo ${formatEuroCompact(live.amount)}, già versati ${formatEuroCompact(paid)}.`
      : isDebt
        ? `«${live.person}». Resta da dare ${formatEuroCompact(remaining)}.`
        : `«${live.person}». Resta da ricevere ${formatEuroCompact(remaining)}.`;

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
              {description}
              {live.dueDate ? ` Scade il ${formatShortDate(live.dueDate)}.` : ""}
              {live.settled ? " Saldato." : ""}
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
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onEdit}>
              Modifica
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                store.updateLedger(live.id, { settled: !live.settled });
                toast.success(live.settled ? "Riaperta" : "Segnata come saldata");
                onOpenChange(false);
              }}
            >
              {live.settled ? "Riapri" : "Segna come saldato"}
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
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground"
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
}: {
  initialKind?: ListKind;
}) {
  const store = useStore();
  const router = useRouter();
  const [kind, setKind] = useState<ListKind>(initialKind);
  const [status, setStatus] = useState<StatusFilter>("aperti");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);

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
          row.kind === "ledger" ? row.item.settled : row.kind === "idea" ? row.item.completed : false;
        if (row.kind === "expense") {
          if (status === "chiusi") return false;
        } else if (status === "aperti" && closed) return false;
        else if (status === "chiusi" && !closed) return false;
      }

      if (!query.trim()) return true;
      const hay = query.trim().toLowerCase();
      if (row.kind === "ledger") {
        return `${row.item.person} ${row.item.notes ?? ""}`.toLowerCase().includes(hay);
      }
      if (row.kind === "expense") {
        return `${CATEGORY_LABELS[row.item.category]} ${row.item.notes ?? ""}`.toLowerCase().includes(hay);
      }
      return `${row.item.title} ${row.item.notes ?? ""} ${row.item.link ?? ""}`.toLowerCase().includes(hay);
    });
  }, [store.data, kind, status, query]);

  function editHref(row: Row) {
    if (row.kind === "ledger") {
      return `/aggiungi?tipo=${row.item.direction}&id=${row.item.id}`;
    }
    if (row.kind === "expense") return `/aggiungi?tipo=spesa&id=${row.item.id}`;
    return `/aggiungi?tipo=idea&id=${row.item.id}`;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Elenco</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sfoglia, filtra, modifica e chiudi i movimenti.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca persona, nota, titolo…"
          className="h-12 rounded-2xl pl-10"
        />
      </div>

      <SegmentedControl
        value={kind}
        onChange={setKind}
        options={[
          { value: "tutti", label: "Tutti" },
          { value: "debiti", label: "Debiti" },
          { value: "crediti", label: "Crediti" },
          { value: "spese", label: "Spese" },
          { value: "idee", label: "Idee" },
        ]}
      />

      <div className="flex gap-2">
        {(["aperti", "chiusi", "tutti"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`h-9 rounded-full px-3 text-xs font-medium ${
              status === value ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            {value === "aperti" ? "Aperti" : value === "chiusi" ? "Chiusi" : "Tutti gli stati"}
          </button>
        ))}
      </div>

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
          title="Niente da mostrare"
          description={
            query
              ? "Nessun risultato per questa ricerca. Prova un altro filtro."
              : "Quando aggiungi debiti, spese o idee, le trovi qui."
          }
          action={
            <Button nativeButton={false} render={<Link href="/aggiungi" />} className="h-11 rounded-2xl">
              Aggiungi
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={`${row.kind}-${row.item.id}`}>
              <button
                type="button"
                onClick={() => setSelected(row)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left ring-1 ring-foreground/8"
              >
                <RowPreview row={row} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected?.kind === "ledger" ? (
        <LedgerAdjustDialog
          item={selected.item}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onEdit={() => {
            const href = editHref(selected);
            setSelected(null);
            router.push(href);
          }}
        />
      ) : (
        <Sheet
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
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
                    {selected.kind === "expense" ? "Spesa" : "Idea di investimento"}
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-3 px-4 text-sm">
                  <p className="text-2xl font-semibold tracking-tight">{formatEuro(selected.item.amount)}</p>
                  {selected.kind === "expense" ? (
                    <p className="text-muted-foreground">{formatShortDate(selected.item.date)}</p>
                  ) : null}
                  {selected.kind === "idea" ? (
                    <>
                      <p className="text-muted-foreground">
                        {selected.item.amountKind === "stimato" ? "Importo stimato" : "Valore attuale"} · priorità{" "}
                        {PRIORITY_LABELS[selected.item.priority].toLowerCase()} · rischio{" "}
                        {RISK_LABELS[selected.item.risk].toLowerCase()}
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
                      <p className={selected.item.completed ? "text-emerald-700" : "text-muted-foreground"}>
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
                    onClick={() => {
                      const href = editHref(selected);
                      setSelected(null);
                      router.push(href);
                    }}
                  >
                    Modifica
                  </Button>
                  {selected.kind === "idea" ? (
                    <Button
                      className="h-11 rounded-2xl"
                      onClick={() => {
                        store.updateIdea(selected.item.id, { completed: !selected.item.completed });
                        toast.success(selected.item.completed ? "Idea riaperta" : "Idea completata");
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
      )}
    </div>
  );
}

function RowPreview({ row }: { row: Row }) {
  if (row.kind === "ledger") {
    return (
      <>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{row.item.person}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.item.direction === "debito" ? "Debito" : "Credito"}
            {` · ${formatEuroCompact(ledgerPaid(row.item))} / ${formatEuroCompact(row.item.amount)}`}
            {row.item.dueDate ? ` · ${formatShortDate(row.item.dueDate)}` : ""}
            {row.item.settled ? " · saldato" : ""}
          </p>
        </div>
        <p className={`text-sm font-medium ${row.item.direction === "debito" ? "text-rose-700" : "text-emerald-700"}`}>
          {row.item.direction === "debito" ? "−" : "+"}
          {formatEuro(ledgerRemaining(row.item))}
        </p>
      </>
    );
  }

  if (row.kind === "expense") {
    return (
      <>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{row.item.notes || CATEGORY_LABELS[row.item.category]}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge className={CATEGORY_ACCENT[row.item.category]} variant="secondary">
              {CATEGORY_LABELS[row.item.category]}
            </Badge>
            {formatShortDate(row.item.date)}
          </p>
        </div>
        <p className="text-sm font-medium">{formatEuro(row.item.amount)}</p>
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
          {row.item.completed ? " · completata" : ""}
        </p>
      </div>
      <p className="text-sm font-medium">{formatEuro(row.item.amount)}</p>
    </>
  );
}

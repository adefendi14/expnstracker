"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lightbulb, Receipt, Scale, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/empty-state";
import { SegmentedControl } from "@/components/segmented-control";
import { useStore } from "@/lib/store";
import {
  CATEGORY_ACCENT,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  RISK_LABELS,
  formatEuro,
  formatShortDate,
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

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.kind === "ledger"
                    ? selected.item.person
                    : selected.kind === "expense"
                      ? CATEGORY_LABELS[selected.item.category]
                      : selected.item.title}
                </SheetTitle>
                <SheetDescription>
                  {selected.kind === "ledger"
                    ? selected.item.direction === "debito"
                      ? "Debito"
                      : "Credito"
                    : selected.kind === "expense"
                      ? "Spesa"
                      : "Idea di investimento"}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-3 px-4 text-sm">
                <p className="text-2xl font-semibold tracking-tight">
                  {formatEuro(
                    selected.kind === "ledger"
                      ? selected.item.amount
                      : selected.kind === "expense"
                        ? selected.item.amount
                        : selected.item.amount
                  )}
                </p>
                {selected.kind === "ledger" ? (
                  <>
                    {selected.item.dueDate ? (
                      <p className="text-muted-foreground">Scadenza {formatShortDate(selected.item.dueDate)}</p>
                    ) : null}
                    <p className={selected.item.settled ? "text-emerald-700" : "text-muted-foreground"}>
                      {selected.item.settled ? "Saldato" : "Aperto"}
                    </p>
                  </>
                ) : null}
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
                {selected.kind === "ledger" ? (
                  <Button
                    className="h-11 rounded-2xl"
                    variant={selected.item.settled ? "secondary" : "default"}
                    onClick={() => {
                      store.updateLedger(selected.item.id, { settled: !selected.item.settled });
                      toast.success(selected.item.settled ? "Riaperta" : "Segnata come saldata");
                      setSelected(null);
                    }}
                  >
                    {selected.item.settled ? "Riapri" : "Segna come saldato"}
                  </Button>
                ) : null}
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
                    if (selected.kind === "ledger") store.deleteLedger(selected.item.id);
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
            {row.item.dueDate ? ` · ${formatShortDate(row.item.dueDate)}` : ""}
            {row.item.settled ? " · saldato" : ""}
          </p>
        </div>
        <p className={`text-sm font-medium ${row.item.direction === "debito" ? "text-rose-700" : "text-emerald-700"}`}>
          {row.item.direction === "debito" ? "−" : "+"}
          {formatEuro(row.item.amount)}
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

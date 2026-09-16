"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldRow, NativeSelect } from "@/components/field";
import { PersonPicker } from "@/components/person-picker";
import { useStore } from "@/lib/store";
import { CATEGORY_LABELS, PRIORITY_LABELS, RISK_LABELS, ledgerPaid, parseEuroInput } from "@/lib/format";
import {
  EXPENSE_CATEGORIES,
  PRIORITIES,
  RISKS,
  type AmountKind,
  type DebtDirection,
  type Expense,
  type ExpenseCategory,
  type InvestmentIdea,
  type LedgerEntry,
  type Priority,
  type Risk,
} from "@/lib/types";

const inputClass = "h-12 rounded-2xl px-3.5";

function saveButton() {
  return (
    <button
      type="submit"
      className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground"
    >
      Salva
    </button>
  );
}

export function LedgerEditDialog({
  item,
  open,
  onOpenChange,
}: {
  item: LedgerEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const store = useStore();
  const live = store.data.ledger.find((entry) => entry.id === item.id) ?? item;
  const [direction, setDirection] = useState<DebtDirection>(live.direction);
  const [person, setPerson] = useState(live.person);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextPerson = person.trim();
    const dueDate = String(data.get("dueDate") ?? "").trim();
    const notes = String(data.get("notes") ?? "").trim();
    if (!nextPerson) {
      setError("Indica chi è coinvolto.");
      return;
    }
    const amount = parseEuroInput(String(data.get("amount") ?? ""));
    if (amount === null || amount === 0) {
      setError("Inserisci un obiettivo in euro.");
      return;
    }
    const paid = Math.min(ledgerPaid(live), amount);
    store.updateLedger(live.id, {
      direction,
      person: nextPerson,
      amount,
      paid,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      settled: paid >= amount,
    });
    toast.success("Movimento aggiornato");
    setError("");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setError("");
          setDirection(live.direction);
          setPerson(live.person);
        }
      }}
    >
      <DialogContent className="rounded-3xl sm:max-w-md">
        <form key={open ? live.id : "closed"} onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{direction === "debito" ? "Modifica debito" : "Modifica credito"}</DialogTitle>
            <DialogDescription>Aggiorna persona, obiettivo e scadenza.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={direction === "debito" ? "default" : "outline"}
              className="h-11 rounded-2xl"
              onClick={() => setDirection("debito")}
            >
              Debito
            </Button>
            <Button
              type="button"
              variant={direction === "credito" ? "default" : "outline"}
              className="h-11 rounded-2xl"
              onClick={() => setDirection("credito")}
            >
              Credito
            </Button>
          </div>
          <Field label="Chi" error={error === "Indica chi è coinvolto." ? error : undefined}>
            <PersonPicker value={person} onChange={setPerson} people={store.data.people} />
          </Field>
          <FieldRow>
            <Field label="Obiettivo" error={error === "Inserisci un obiettivo in euro." ? error : undefined}>
              <Input
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={String(live.amount).replace(".", ",")}
                className={inputClass}
              />
            </Field>
            <Field label="Scadenza" hint="Facoltativa">
              <Input name="dueDate" type="date" defaultValue={live.dueDate ?? ""} className={inputClass} />
            </Field>
          </FieldRow>
          <Field label="Note" hint="Facoltative">
            <Textarea name="notes" defaultValue={live.notes ?? ""} className="min-h-20 rounded-2xl" />
          </Field>
          <DialogFooter>{saveButton()}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseEditDialog({
  item,
  open,
  onOpenChange,
}: {
  item: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const store = useStore();
  const live = store.data.expenses.find((entry) => entry.id === item.id) ?? item;
  const [error, setError] = useState("");
  const [person, setPerson] = useState(
    live.personId ? (store.data.people.find((entry) => entry.id === live.personId)?.name ?? "") : ""
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = parseEuroInput(String(data.get("amount") ?? ""));
    const date = String(data.get("date") ?? "");
    const category = String(data.get("category") ?? live.category) as ExpenseCategory;
    const notes = String(data.get("notes") ?? "").trim();
    if (amount === null || amount === 0) {
      setError("Inserisci un importo valido.");
      return;
    }
    if (!date) {
      setError("Scegli una data.");
      return;
    }
    store.updateExpense(live.id, {
      amount,
      date,
      category,
      notes: notes || undefined,
      person: person.trim() ? person.trim() : null,
    });
    toast.success("Spesa aggiornata");
    setError("");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError("");
      }}
    >
      <DialogContent className="rounded-3xl sm:max-w-md">
        <form key={open ? live.id : "closed"} onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Modifica spesa</DialogTitle>
            <DialogDescription>Aggiorna importo, categoria e data.</DialogDescription>
          </DialogHeader>
          <Field label="Importo" error={error.includes("importo") ? error : undefined}>
            <Input
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={String(live.amount).replace(".", ",")}
              className={inputClass}
            />
          </Field>
          <FieldRow>
            <Field label="Categoria">
              <NativeSelect name="category" defaultValue={live.category} className="rounded-2xl">
                {EXPENSE_CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Data" error={error === "Scegli una data." ? error : undefined}>
              <Input name="date" type="date" defaultValue={live.date} className={inputClass} />
            </Field>
          </FieldRow>
          <Field label="Note" hint="Facoltative">
            <Textarea name="notes" defaultValue={live.notes ?? ""} className="min-h-20 rounded-2xl" />
          </Field>
          <Field label="Chi" hint="Facoltativo">
            <PersonPicker value={person} onChange={setPerson} people={store.data.people} optional />
          </Field>
          <DialogFooter>{saveButton()}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IdeaEditDialog({
  item,
  open,
  onOpenChange,
}: {
  item: InvestmentIdea;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const store = useStore();
  const live = store.data.ideas.find((entry) => entry.id === item.id) ?? item;
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const amount = parseEuroInput(String(data.get("amount") ?? ""));
    const amountKind = String(data.get("amountKind") ?? live.amountKind) as AmountKind;
    const priority = String(data.get("priority") ?? live.priority) as Priority;
    const risk = String(data.get("risk") ?? live.risk) as Risk;
    const notes = String(data.get("notes") ?? "").trim();
    const link = String(data.get("link") ?? "").trim();
    if (!title) {
      setError("Inserisci titolo o strumento.");
      return;
    }
    if (amount === null) {
      setError("Inserisci un importo (anche 0).");
      return;
    }
    if (link) {
      try {
        new URL(link);
      } catch {
        setError("Inserisci un link valido, ad esempio https://…");
        return;
      }
    }
    store.updateIdea(live.id, {
      title,
      amount,
      amountKind,
      priority,
      risk,
      notes: notes || undefined,
      link: link || undefined,
    });
    toast.success("Idea aggiornata");
    setError("");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError("");
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <form key={open ? live.id : "closed"} onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Modifica idea</DialogTitle>
            <DialogDescription>Aggiorna titolo, importo e dettagli.</DialogDescription>
          </DialogHeader>
          <Field label="Titolo o strumento" error={error.includes("titolo") ? error : undefined}>
            <Input name="title" defaultValue={live.title} className={inputClass} autoComplete="off" />
          </Field>
          <FieldRow>
            <Field label="Importo" error={error.includes("importo") ? error : undefined}>
              <Input
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={String(live.amount).replace(".", ",")}
                className={inputClass}
              />
            </Field>
            <Field label="Tipo importo">
              <NativeSelect name="amountKind" defaultValue={live.amountKind} className="rounded-2xl">
                <option value="stimato">Stimato</option>
                <option value="attuale">Attuale</option>
              </NativeSelect>
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Priorità">
              <NativeSelect name="priority" defaultValue={live.priority} className="rounded-2xl">
                {PRIORITIES.map((key) => (
                  <option key={key} value={key}>
                    {PRIORITY_LABELS[key]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Rischio">
              <NativeSelect name="risk" defaultValue={live.risk} className="rounded-2xl">
                {RISKS.map((key) => (
                  <option key={key} value={key}>
                    {RISK_LABELS[key]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </FieldRow>
          <Field label="Note" hint="Facoltative">
            <Textarea name="notes" defaultValue={live.notes ?? ""} className="min-h-20 rounded-2xl" />
          </Field>
          <Field label="Link" hint="Facoltativo" error={error.includes("link") ? error : undefined}>
            <Input name="link" type="url" defaultValue={live.link ?? ""} placeholder="https://" className={inputClass} />
          </Field>
          {error && !error.includes("titolo") && !error.includes("importo") && !error.includes("link") ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
          <DialogFooter>{saveButton()}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

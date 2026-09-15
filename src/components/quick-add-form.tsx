"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldRow, NativeSelect } from "@/components/field";
import { SegmentedControl } from "@/components/segmented-control";
import { useStore } from "@/lib/store";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  RISK_LABELS,
  parseEuroInput,
  todayIso,
} from "@/lib/format";
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

type FormTab = "ledger" | "spesa" | "idea";

const TAB_ITEMS = {
  ledger: "Debito / Credito",
  spesa: "Spesa",
  idea: "Idea di investimento",
};

const inputClass = "h-12 rounded-2xl px-3.5";

export function QuickAddForm({
  initialTab,
  ledger,
  expense,
  idea,
}: {
  initialTab?: FormTab;
  ledger?: LedgerEntry;
  expense?: Expense;
  idea?: InvestmentIdea;
}) {
  const router = useRouter();
  const store = useStore();
  const editing = Boolean(ledger || expense || idea);

  const defaultTab: FormTab = useMemo(() => {
    if (initialTab) return initialTab;
    if (expense) return "spesa";
    if (idea) return "idea";
    return "ledger";
  }, [initialTab, expense, idea]);

  const [tab, setTab] = useState<FormTab>(defaultTab);
  const [direction, setDirection] = useState<DebtDirection>(ledger?.direction ?? "debito");
  const [person, setPerson] = useState(ledger?.person ?? "");
  const [ledgerAmount, setLedgerAmount] = useState(ledger ? String(ledger.amount).replace(".", ",") : "");
  const [dueDate, setDueDate] = useState(ledger?.dueDate ?? "");
  const [ledgerNotes, setLedgerNotes] = useState(ledger?.notes ?? "");

  const [expenseAmount, setExpenseAmount] = useState(
    expense ? String(expense.amount).replace(".", ",") : ""
  );
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "casa");
  const [expenseDate, setExpenseDate] = useState(expense?.date ?? todayIso());
  const [expenseNotes, setExpenseNotes] = useState(expense?.notes ?? "");

  const [title, setTitle] = useState(idea?.title ?? "");
  const [ideaAmount, setIdeaAmount] = useState(idea ? String(idea.amount).replace(".", ",") : "");
  const [amountKind, setAmountKind] = useState<AmountKind>(idea?.amountKind ?? "stimato");
  const [priority, setPriority] = useState<Priority>(idea?.priority ?? "media");
  const [risk, setRisk] = useState<Risk>(idea?.risk ?? "medio");
  const [ideaNotes, setIdeaNotes] = useState(idea?.notes ?? "");
  const [link, setLink] = useState(idea?.link ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function goBack() {
    router.push(tab === "idea" ? "/elenco?tipo=idee" : tab === "spesa" ? "/elenco?tipo=spese" : "/elenco");
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {};

    if (tab === "ledger") {
      if (!person.trim()) nextErrors.person = "Indica chi è coinvolto.";
      const amount = parseEuroInput(ledgerAmount);
      if (amount === null || amount === 0) nextErrors.ledgerAmount = "Inserisci un importo valido.";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;

      const payload = {
        direction,
        person: person.trim(),
        amount: amount!,
        dueDate: dueDate || undefined,
        notes: ledgerNotes.trim() || undefined,
        settled: ledger?.settled ?? false,
      };
      if (ledger) {
        store.updateLedger(ledger.id, payload);
        toast.success("Movimento aggiornato");
      } else {
        store.addLedger(payload);
        toast.success(direction === "debito" ? "Debito salvato" : "Credito salvato");
      }
      goBack();
      return;
    }

    if (tab === "spesa") {
      const amount = parseEuroInput(expenseAmount);
      if (amount === null || amount === 0) nextErrors.expenseAmount = "Inserisci un importo valido.";
      if (!expenseDate) nextErrors.expenseDate = "Scegli una data.";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;

      const payload = {
        amount: amount!,
        category,
        date: expenseDate,
        notes: expenseNotes.trim() || undefined,
      };
      if (expense) {
        store.updateExpense(expense.id, payload);
        toast.success("Spesa aggiornata");
      } else {
        store.addExpense(payload);
        toast.success("Spesa salvata");
      }
      goBack();
      return;
    }

    if (!title.trim()) nextErrors.title = "Inserisci titolo o strumento.";
    const amount = parseEuroInput(ideaAmount);
    if (amount === null) nextErrors.ideaAmount = "Inserisci un importo (anche 0).";
    if (link.trim()) {
      try {
        new URL(link.trim());
      } catch {
        nextErrors.link = "Inserisci un link valido, ad esempio https://…";
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      title: title.trim(),
      amount: amount!,
      amountKind,
      priority,
      risk,
      notes: ideaNotes.trim() || undefined,
      link: link.trim() || undefined,
      completed: idea?.completed ?? false,
    };
    if (idea) {
      store.updateIdea(idea.id, payload);
      toast.success("Idea aggiornata");
    } else {
      store.addIdea(payload);
      toast.success("Idea salvata");
    }
    goBack();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {editing ? "Modifica" : "Aggiungi"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un solo modulo per debiti, crediti, spese e idee di investimento.
        </p>
      </div>

      <SegmentedControl
        value={tab}
        onChange={(next) => {
          if (editing) return;
          setTab(next);
          setErrors({});
        }}
        disabled={editing}
        options={[
          { value: "ledger", label: "Debito/Credito" },
          { value: "spesa", label: "Spesa" },
          { value: "idea", label: "Idea" },
        ]}
      />

      {tab === "ledger" ? (
        <div className="flex flex-col gap-4">
          <Field label="Tipo">
            <NativeSelect
              value={direction}
              onChange={(event) => setDirection(event.target.value as DebtDirection)}
            >
              <option value="debito">Debito (devo)</option>
              <option value="credito">Credito (mi devono)</option>
            </NativeSelect>
          </Field>
          <Field label="Chi" htmlFor="person" error={errors.person}>
            <Input
              id="person"
              name="person"
              value={person}
              onChange={(event) => setPerson(event.target.value)}
              placeholder="Marco, inquilino, banca…"
              className={inputClass}
              autoComplete="off"
            />
          </Field>
          <FieldRow>
            <Field
              label="Obiettivo"
              htmlFor="ledger-amount"
              error={errors.ledgerAmount}
              hint="Poi versi dall’elenco, come un salvadanaio. Se cresce, alzi l’obiettivo."
            >
              <Input
                id="ledger-amount"
                inputMode="decimal"
                autoComplete="off"
                value={ledgerAmount}
                onChange={(event) => setLedgerAmount(event.target.value)}
                placeholder="0,00"
                className={inputClass}
              />
            </Field>
            <Field label="Scadenza" htmlFor="due-date" hint="Facoltativa">
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={inputClass}
              />
            </Field>
          </FieldRow>
          <Field label="Note" htmlFor="ledger-notes" hint="Facoltative">
            <Textarea
              id="ledger-notes"
              value={ledgerNotes}
              onChange={(event) => setLedgerNotes(event.target.value)}
              placeholder="Motivo, accordo, promemoria…"
              className="min-h-24 rounded-2xl px-3.5"
            />
          </Field>
        </div>
      ) : null}

      {tab === "spesa" ? (
        <div className="flex flex-col gap-4">
          <Field label="Importo" htmlFor="expense-amount" error={errors.expenseAmount}>
            <Input
              id="expense-amount"
              inputMode="decimal"
              autoComplete="off"
              value={expenseAmount}
              onChange={(event) => setExpenseAmount(event.target.value)}
              placeholder="0,00"
              className={inputClass}
            />
          </Field>
          <FieldRow>
            <Field label="Categoria">
              <NativeSelect
                value={category}
                onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
              >
                {EXPENSE_CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Data" htmlFor="expense-date" error={errors.expenseDate}>
              <Input
                id="expense-date"
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                className={inputClass}
              />
            </Field>
          </FieldRow>
          <Field label="Note" htmlFor="expense-notes" hint="Facoltative">
            <Textarea
              id="expense-notes"
              value={expenseNotes}
              onChange={(event) => setExpenseNotes(event.target.value)}
              placeholder="Spesa al supermercato, cena, bolletta…"
              className="min-h-24 rounded-2xl px-3.5"
            />
          </Field>
        </div>
      ) : null}

      {tab === "idea" ? (
        <div className="flex flex-col gap-4">
          <Field label="Titolo o strumento" htmlFor="idea-title" error={errors.title}>
            <Input
              id="idea-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="ETF mondiale, BTP, oro…"
              className={inputClass}
            />
          </Field>
          <FieldRow>
            <Field label="Importo" htmlFor="idea-amount" error={errors.ideaAmount}>
              <Input
                id="idea-amount"
                inputMode="decimal"
                autoComplete="off"
                value={ideaAmount}
                onChange={(event) => setIdeaAmount(event.target.value)}
                placeholder="0,00"
                className={inputClass}
              />
            </Field>
            <Field label="Tipo importo">
              <NativeSelect
                value={amountKind}
                onChange={(event) => setAmountKind(event.target.value as AmountKind)}
              >
                <option value="stimato">Importo stimato</option>
                <option value="attuale">Valore attuale</option>
              </NativeSelect>
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Priorità">
              <NativeSelect
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
              >
                {PRIORITIES.map((key) => (
                  <option key={key} value={key}>
                    {PRIORITY_LABELS[key]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Rischio">
              <NativeSelect value={risk} onChange={(event) => setRisk(event.target.value as Risk)}>
                {RISKS.map((key) => (
                  <option key={key} value={key}>
                    {RISK_LABELS[key]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </FieldRow>
          <Field label="Note" htmlFor="idea-notes" hint="Facoltative">
            <Textarea
              id="idea-notes"
              value={ideaNotes}
              onChange={(event) => setIdeaNotes(event.target.value)}
              placeholder="Tesi, orizzonte, perché ti interessa…"
              className="min-h-24 rounded-2xl px-3.5"
            />
          </Field>
          <Field label="Link" htmlFor="idea-link" hint="Facoltativo" error={errors.link}>
            <Input
              id="idea-link"
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://"
              className={inputClass}
            />
          </Field>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <button
          type="button"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-primary px-4 text-base font-medium text-primary-foreground"
          onClick={handleSave}
        >
          {editing ? "Salva modifiche" : "Salva"}
        </button>
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 rounded-2xl text-base"
          onClick={() => router.push("/")}
        >
          Annulla
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">{TAB_ITEMS[tab]} · valuta in euro</p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AssociationPicker } from "@/components/association-picker";
import { Field, FieldRow, NativeSelect } from "@/components/field";
import { EnterReveal, FadeSwap } from "@/components/motion";
import { PersonPicker } from "@/components/person-picker";
import { SegmentedControl } from "@/components/segmented-control";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  RISK_LABELS,
  normalizeLedgerTitle,
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
  const [ledgerTitle, setLedgerTitle] = useState(ledger?.title ?? "");
  const [person, setPerson] = useState(ledger?.person ?? "");
  const [ledgerAmount, setLedgerAmount] = useState(ledger ? String(ledger.amount).replace(".", ",") : "");
  const [dueDate, setDueDate] = useState(ledger?.dueDate ?? "");
  const [ledgerNotes, setLedgerNotes] = useState(ledger?.notes ?? "");
  const [associateQuery, setAssociateQuery] = useState("");
  const [associatedLedgerId, setAssociatedLedgerId] = useState(ledger?.associatedLedgerId);

  const [expenseAmount, setExpenseAmount] = useState(
    expense ? String(expense.amount).replace(".", ",") : ""
  );
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "casa");
  const [expenseDate, setExpenseDate] = useState(expense?.date ?? todayIso());
  const [expenseNotes, setExpenseNotes] = useState(expense?.notes ?? "");
  const [expensePerson, setExpensePerson] = useState(
    expense?.personId ? (store.data.people.find((item) => item.id === expense.personId)?.name ?? "") : ""
  );

  const [title, setTitle] = useState(idea?.title ?? "");
  const [ideaAmount, setIdeaAmount] = useState(idea ? String(idea.amount).replace(".", ",") : "");
  const [amountKind, setAmountKind] = useState<AmountKind>(idea?.amountKind ?? "stimato");
  const [priority, setPriority] = useState<Priority>(idea?.priority ?? "media");
  const [risk, setRisk] = useState<Risk>(idea?.risk ?? "medio");
  const [ideaNotes, setIdeaNotes] = useState(idea?.notes ?? "");
  const [link, setLink] = useState(idea?.link ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function goBack() {
    router.push(
      tab === "idea" ? "/cronologia?tipo=idee" : tab === "spesa" ? "/cronologia?tipo=spese" : "/cronologia"
    );
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {};

    if (tab === "ledger") {
      const title = normalizeLedgerTitle(ledgerTitle);
      if (!title) nextErrors.ledgerTitle = "Inserisci un titolo univoco.";
      else if (!store.isLedgerTitleAvailable(title, ledger?.id)) {
        nextErrors.ledgerTitle = "Questo titolo esiste già.";
      }
      if (!person.trim()) nextErrors.person = "Indica chi è coinvolto.";
      const amount = parseEuroInput(ledgerAmount);
      if (amount === null || amount === 0) nextErrors.ledgerAmount = "Inserisci un importo valido.";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;

      const payload = {
        title,
        direction,
        person: person.trim(),
        amount: amount!,
        dueDate: dueDate || undefined,
        notes: ledgerNotes.trim() || undefined,
        associatedLedgerId: associatedLedgerId || undefined,
        settled: ledger?.settled ?? false,
      };
      try {
        if (ledger) {
          store.updateLedger(ledger.id, payload);
          toast.success("Movimento aggiornato");
        } else {
          store.addLedger(payload);
          toast.success(direction === "debito" ? "Debito salvato" : "Credito salvato");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Salvataggio non riuscito");
        return;
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
        person: expensePerson.trim() || undefined,
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 md:gap-5 md:px-8 md:py-6">
      {editing ? (
        <EnterReveal skeletonClassName="rounded-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Modifica</h1>
        </EnterReveal>
      ) : null}

      <EnterReveal skeletonClassName="rounded-2xl">
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
      </EnterReveal>

      <EnterReveal delay={50} skeletonClassName="rounded-3xl">
      <FadeSwap id={tab} tone="lift">
      {tab === "ledger" ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection("debito")}
              className={cn(
                "rounded-2xl px-3 py-3.5 text-left ring-1 transition-[background-color,box-shadow,color,transform] duration-200 active:scale-[0.98]",
                direction === "debito"
                  ? "bg-brand/40 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] ring-brand/55 backdrop-blur-md"
                  : "bg-muted/60 text-muted-foreground ring-foreground/8 hover:bg-muted"
              )}
              aria-pressed={direction === "debito"}
            >
              <span
                className={cn(
                  "mb-2 flex size-8 items-center justify-center rounded-full",
                  direction === "debito" ? "bg-white/15 text-white" : "bg-brand-soft text-brand"
                )}
              >
                <ArrowUpRight className="size-4" />
              </span>
              <p className="text-sm font-semibold">Debito</p>
              <p className={cn("mt-0.5 text-xs", direction === "debito" ? "text-white/80" : "text-muted-foreground")}>
                Devo io
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDirection("credito")}
              className={cn(
                "rounded-2xl px-3 py-3.5 text-left ring-1 transition-[background-color,box-shadow,color,transform] duration-200 active:scale-[0.98]",
                direction === "credito"
                  ? "bg-brand/40 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] ring-brand/55 backdrop-blur-md"
                  : "bg-muted/60 text-muted-foreground ring-foreground/8 hover:bg-muted"
              )}
              aria-pressed={direction === "credito"}
            >
              <span
                className={cn(
                  "mb-2 flex size-8 items-center justify-center rounded-full",
                  direction === "credito" ? "bg-white/15 text-white" : "bg-brand-soft text-brand"
                )}
              >
                <ArrowDownLeft className="size-4" />
              </span>
              <p className="text-sm font-semibold">Credito</p>
              <p className={cn("mt-0.5 text-xs", direction === "credito" ? "text-white/80" : "text-muted-foreground")}>
                Mi devono
              </p>
            </button>
          </div>

          <Field label="Titolo" htmlFor="ledger-title" error={errors.ledgerTitle}>
            <Input
              id="ledger-title"
              value={ledgerTitle}
              onChange={(event) => setLedgerTitle(event.target.value)}
              placeholder="Es. Affitto marzo, Prestito auto…"
              className={inputClass}
              autoComplete="off"
            />
          </Field>
          <Field label="Chi" htmlFor="person" error={errors.person}>
            <PersonPicker
              id="person"
              value={person}
              onChange={setPerson}
              people={store.data.people}
              placeholder="Nome"
            />
          </Field>
          <Field label="Quantità" htmlFor="ledger-amount" error={errors.ledgerAmount}>
            <Input
              id="ledger-amount"
              inputMode="decimal"
              autoComplete="off"
              value={ledgerAmount}
              onChange={(event) => setLedgerAmount(event.target.value)}
              placeholder="0,00"
              className={`${inputClass} w-[7.5rem] max-w-full tabular-nums`}
            />
          </Field>
          <Field label="Associa a" htmlFor="associate">
            <AssociationPicker
              value={associateQuery}
              selectedId={associatedLedgerId}
              ledger={store.data.ledger}
              people={store.data.people}
              excludeId={ledger?.id}
              onChange={({ query, associatedLedgerId: nextId }) => {
                setAssociateQuery(query);
                setAssociatedLedgerId(nextId);
              }}
            />
          </Field>
          <Field label="Scadenza" htmlFor="due-date">
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Note" htmlFor="ledger-notes">
            <Textarea
              id="ledger-notes"
              value={ledgerNotes}
              onChange={(event) => setLedgerNotes(event.target.value)}
              placeholder="Opzionale"
              className="min-h-20 rounded-2xl px-3.5"
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
          <Field label="Note" htmlFor="expense-notes">
            <Textarea
              id="expense-notes"
              value={expenseNotes}
              onChange={(event) => setExpenseNotes(event.target.value)}
              className="min-h-24 rounded-2xl px-3.5"
            />
          </Field>
          <Field label="Chi" htmlFor="expense-person">
            <PersonPicker
              id="expense-person"
              value={expensePerson}
              onChange={setExpensePerson}
              people={store.data.people}
              placeholder="Opzionale"
              optional
            />
          </Field>
        </div>
      ) : null}

      {tab === "idea" ? (
        <div className="flex flex-col gap-4">
          <Field label="Titolo" htmlFor="idea-title" error={errors.title}>
            <Input
              id="idea-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titolo"
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
          <Field label="Note" htmlFor="idea-notes">
            <Textarea
              id="idea-notes"
              value={ideaNotes}
              onChange={(event) => setIdeaNotes(event.target.value)}
              className="min-h-24 rounded-2xl px-3.5"
            />
          </Field>
          <Field label="Link" htmlFor="idea-link" error={errors.link}>
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
      </FadeSwap>
      </EnterReveal>

      <EnterReveal delay={90} skeletonClassName="rounded-2xl">
        <div className="flex flex-row justify-center gap-2 pt-1">
          <button
            type="button"
            className="inline-flex h-14 w-[min(100%,9.5rem)] items-center justify-center rounded-2xl bg-brand-strong px-4 text-sm font-semibold text-brand-foreground transition-transform active:scale-[0.98] sm:h-12 sm:w-auto sm:min-w-[8.5rem] sm:flex-1 sm:text-base sm:font-medium"
            onClick={handleSave}
          >
            Salva
          </button>
          <Button
            type="button"
            variant="outline"
            className="h-14 w-[min(100%,9.5rem)] rounded-2xl text-sm font-semibold sm:h-12 sm:w-auto sm:min-w-[8.5rem] sm:flex-1 sm:text-base sm:font-medium"
            onClick={() => router.push("/")}
          >
            Annulla
          </Button>
        </div>
      </EnterReveal>
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { MoreHorizontal, PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/field";
import { EmptyState } from "@/components/empty-state";
import { useStore } from "@/lib/store";
import { formatEuroCompact, parseEuroInput } from "@/lib/format";
import type { PiggyBank as PiggyBankType } from "@/lib/types";

const inputClass = "h-12 rounded-2xl px-3.5";

function percent(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function PiggyBankCard({ piggy }: { piggy: PiggyBankType }) {
  const store = useStore();
  const [fundsOpen, setFundsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [error, setError] = useState("");
  const value = percent(piggy.current, piggy.target);

  function submitFunds(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseEuroInput(String(new FormData(event.currentTarget).get("amount") ?? ""));
    if (parsed === null || parsed === 0) {
      setError("Inserisci un importo valido.");
      return;
    }
    const delta = mode === "add" ? parsed : -parsed;
    if (mode === "remove" && parsed > piggy.current) {
      setError("Non puoi prelevare più di quanto c’è nel salvadanaio.");
      return;
    }
    store.adjustPiggy(piggy.id, delta);
    toast.success(mode === "add" ? "Fondi aggiunti" : "Fondi prelevati");
    setError("");
    setFundsOpen(false);
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextName = String(data.get("name") ?? "");
    const nextTarget = String(data.get("target") ?? "");
    const nextNotes = String(data.get("notes") ?? "");
    if (!nextName.trim()) {
      setError("Dai un nome all’obiettivo.");
      return;
    }
    const parsed = parseEuroInput(nextTarget);
    if (parsed === null || parsed === 0) {
      setError("Inserisci un obiettivo in euro.");
      return;
    }
    store.updatePiggy(piggy.id, {
      name: nextName.trim(),
      target: parsed,
      notes: nextNotes.trim() || undefined,
    });
    toast.success("Obiettivo aggiornato");
    setError("");
    setEditOpen(false);
  }

  return (
    <article className="rounded-3xl bg-card p-5 ring-1 ring-foreground/8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium tracking-tight">{piggy.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatEuroCompact(piggy.current)} / {formatEuroCompact(piggy.target)} — {value}%
          </p>
        </div>
        <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton
          className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Azioni"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Modifica</DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                store.deletePiggy(piggy.id);
                toast.success("Salvadanaio eliminato");
              }}
            >
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Progress value={value} className="mt-4">
        <span className="sr-only">Progresso {value} percento</span>
      </Progress>
      {value >= 100 ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">Obiettivo raggiunto</p>
      ) : null}
      {piggy.notes ? <p className="mt-3 text-sm text-muted-foreground">{piggy.notes}</p> : null}
      <Button className="mt-4 h-11 w-full rounded-2xl" variant="secondary" onClick={() => setFundsOpen(true)}>
        Aggiungi fondi
      </Button>

      <Dialog open={fundsOpen} onOpenChange={setFundsOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <form onSubmit={submitFunds} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Aggiungi fondi</DialogTitle>
              <DialogDescription>
                Aggiungi o preleva dal salvadanaio «{piggy.name}».
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "add" ? "default" : "outline"}
                className="h-11 rounded-2xl"
                onClick={() => setMode("add")}
              >
                Aggiungi
              </Button>
              <Button
                type="button"
                variant={mode === "remove" ? "default" : "outline"}
                className="h-11 rounded-2xl"
                onClick={() => setMode("remove")}
              >
                Preleva
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <form onSubmit={submitEdit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Modifica obiettivo</DialogTitle>
              <DialogDescription>Aggiorna nome, target e note.</DialogDescription>
            </DialogHeader>
            <Field label="Nome">
              <Input name="name" defaultValue={piggy.name} className={inputClass} autoComplete="off" />
            </Field>
            <Field label="Obiettivo in euro" error={error}>
              <Input
                name="target"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={String(piggy.target).replace(".", ",")}
                className={inputClass}
              />
            </Field>
            <Field label="Note">
              <Textarea name="notes" defaultValue={piggy.notes ?? ""} className="min-h-20 rounded-2xl" />
            </Field>
            <DialogFooter>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Salva
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function CreatePiggyButton() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "");
    const target = String(data.get("target") ?? "");
    const current = String(data.get("current") ?? "");
    const notes = String(data.get("notes") ?? "");
    if (!name.trim()) {
      setError("Dai un nome all’obiettivo.");
      return;
    }
    const parsedTarget = parseEuroInput(target);
    if (parsedTarget === null || parsedTarget === 0) {
      setError("Inserisci un obiettivo in euro.");
      return;
    }
    const parsedCurrent = current.trim() ? parseEuroInput(current) : 0;
    if (parsedCurrent === null) {
      setError("Importo iniziale non valido.");
      return;
    }
    store.addPiggy({
      name: name.trim(),
      target: parsedTarget,
      current: parsedCurrent,
      notes: notes.trim() || undefined,
    });
    toast.success("Salvadanaio creato");
    setError("");
    setOpen(false);
  }

  return (
    <>
      <Button className="h-12 rounded-2xl" onClick={() => setOpen(true)}>
        Nuovo obiettivo
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError("");
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Nuovo salvadanaio</DialogTitle>
              <DialogDescription>Crea un obiettivo con un target in euro.</DialogDescription>
            </DialogHeader>
            <Field label="Nome">
              <Input
                name="name"
                placeholder="Viaggio, fondo emergenza…"
                className={inputClass}
                autoComplete="off"
              />
            </Field>
            <Field label="Obiettivo in euro" error={error}>
              <Input
                name="target"
                inputMode="decimal"
                autoComplete="off"
                placeholder="1000"
                className={inputClass}
              />
            </Field>
            <Field label="Già messo da parte" hint="Facoltativo">
              <Input
                name="current"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                className={inputClass}
              />
            </Field>
            <Field label="Note" hint="Facoltative">
              <Textarea name="notes" className="min-h-20 rounded-2xl" />
            </Field>
            <DialogFooter>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Crea
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PiggyBankScreen() {
  const { data } = useStore();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Salvadanai</h1>
          <p className="mt-1 text-sm text-muted-foreground">Obiettivi in euro, progresso minimo.</p>
        </div>
        <CreatePiggyButton />
      </div>
      {data.piggyBanks.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="size-5" />}
          title="Nessun obiettivo"
          description="Crea un salvadanaio, ad esempio 1.000€ per un viaggio, e aggiungi i fondi man mano."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.piggyBanks.map((piggy) => (
            <PiggyBankCard key={piggy.id} piggy={piggy} />
          ))}
        </div>
      )}
    </div>
  );
}

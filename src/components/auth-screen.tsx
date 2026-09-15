"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { SegmentedControl } from "@/components/segmented-control";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";

const inputClass = "h-12 rounded-2xl px-3.5";

export function AuthScreen() {
  const { hasAccounts, register, login, importDatabase, errorMessage } = useStore();
  const [mode, setMode] = useState<"accedi" | "registrati">(hasAccounts ? "accedi" : "registrati");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      if (mode === "registrati") {
        if (password !== confirm) {
          throw new Error("Le password non coincidono.");
        }
        await register({ name, username, password });
        toast.success("Account creato. I tuoi dati restano nel file SQLite.");
      } else {
        await login(username, password);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Accesso non riuscito.");
    } finally {
      setPending(false);
    }
  }

  async function onImport(file: File | undefined) {
    if (!file) return;
    setFormError(null);
    setPending(true);
    try {
      await importDatabase(file);
      toast.success("Database importato. Accedi con un account del file.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Importazione non riuscita.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        ExpnsTracker
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {hasAccounts ? "Accedi al tuo account" : "Crea il primo account"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Ogni persona ha il suo spazio. Il database è un file SQLite su questo dispositivo: niente
        cloud, niente account online.
      </p>

      {hasAccounts ? (
        <div className="mt-6">
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: "accedi", label: "Accedi" },
              { value: "registrati", label: "Registrati" },
            ]}
            disabled={pending}
          />
        </div>
      ) : null}

      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
        {mode === "registrati" ? (
          <Field label="Nome" htmlFor="name">
            <Input
              id="name"
              name="name"
              autoComplete="name"
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Andrea"
            />
          </Field>
        ) : null}
        <Field label="Username" htmlFor="username">
          <Input
            id="username"
            name="username"
            autoComplete="username"
            className={inputClass}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="andrea"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "registrati" ? "new-password" : "current-password"}
            className={inputClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {mode === "registrati" ? (
          <Field label="Conferma password" htmlFor="confirm">
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </Field>
        ) : null}

        {formError || errorMessage ? (
          <p className="text-sm text-destructive">{formError ?? errorMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Un attimo…" : mode === "registrati" ? "Crea account" : "Entra"}
        </button>
      </form>

      <div className="mt-8 border-t border-foreground/8 pt-6">
        <p className="text-xs leading-5 text-muted-foreground">
          Hai già un file <span className="font-medium text-foreground">expnstracker.sqlite</span>?
          Importalo per riprendere account e movimenti su questo browser.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".sqlite,.db,application/vnd.sqlite3"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onImport(file);
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium"
        >
          Importa database
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-mark";
import { BootLoading } from "@/components/boot-loading";
import { Field } from "@/components/field";
import { FadeSwap } from "@/components/motion";
import { SegmentedControl } from "@/components/segmented-control";
import { Input } from "@/components/ui/input";
import { SqliteFileInput } from "@/components/sqlite-file-input";
import { useStore } from "@/lib/store";

const inputClass = "h-12 rounded-2xl px-3.5";

type AuthMode = "accedi" | "registrati" | "recupero" | "nuova-password";

function readRecoveryFromUrl() {
  if (typeof window === "undefined") return null;
  const raw = new URL(window.location.href).searchParams.get("recupero");
  if (!raw) return null;
  const [userId, token] = raw.split(".");
  if (!userId || !token) return null;
  return { userId, token };
}

function clearRecoveryFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("recupero")) return;
  url.searchParams.delete("recupero");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function AuthScreen() {
  const {
    hasAccounts,
    register,
    login,
    loginWithPin,
    isPinLoginAvailable,
    requestPasswordRecovery,
    finishPasswordRecovery,
    importDatabase,
    errorMessage,
  } = useStore();
  const [mode, setMode] = useState<AuthMode>(hasAccounts ? "accedi" : "registrati");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pin, setPin] = useState("");
  const [usePin, setUsePin] = useState(false);
  const [pinAvailable, setPinAvailable] = useState(false);
  const [recoveryLookup, setRecoveryLookup] = useState("");
  const [recoveryPayload, setRecoveryPayload] = useState<{ userId: string; token: string } | null>(
    null
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fromUrl = readRecoveryFromUrl();
    if (fromUrl) {
      setRecoveryPayload(fromUrl);
      setMode("nuova-password");
      return;
    }
    setMode(hasAccounts ? "accedi" : "registrati");
  }, [hasAccounts]);

  useEffect(() => {
    if (mode !== "accedi") return;
    setPinAvailable(isPinLoginAvailable(username));
  }, [username, mode, isPinLoginAvailable]);

  useEffect(() => {
    if (!pinAvailable) setUsePin(false);
  }, [pinAvailable]);

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
        toast.success("Account creato");
      } else if (mode === "accedi") {
        if (usePin) {
          await loginWithPin(username, pin);
        } else {
          await login(username, password);
        }
      } else if (mode === "recupero") {
        const result = await requestPasswordRecovery(recoveryLookup);
        if (result.channel === "email") {
          toast.success(result.detail);
        } else {
          toast.message(result.detail);
        }
        setMode("accedi");
      } else if (mode === "nuova-password") {
        if (!recoveryPayload) {
          throw new Error("Link di recupero mancante.");
        }
        await finishPasswordRecovery(
          recoveryPayload.userId,
          recoveryPayload.token,
          password,
          confirm
        );
        clearRecoveryFromUrl();
        toast.success("Password aggiornata");
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
      toast.success("Database importato");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Importazione non riuscita.");
    } finally {
      setPending(false);
    }
  }

  if (pending) {
    const label =
      mode === "registrati"
        ? "Creazione account"
        : mode === "recupero"
          ? "Invio recupero"
          : mode === "nuova-password"
            ? "Aggiornamento password"
            : "Accesso in corso";
    return <BootLoading label={label} />;
  }

  const showImport = mode === "accedi" || mode === "registrati";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="flex flex-col items-center text-center">
        <BrandMark framed={false} className="size-28" size={112} />
        <p className="mt-5 text-sm font-semibold tracking-tight text-brand">ExpnsTracker</p>
      </div>

      {mode === "accedi" || mode === "registrati" ? (
        <div className="mt-6">
          <SegmentedControl<"accedi" | "registrati">
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

      <FadeSwap id={mode} className="mt-6" tone="lift">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
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

          {mode === "accedi" || mode === "registrati" ? (
            <Field
              label="Email"
              htmlFor="username"
              hint={mode === "registrati" ? "Deve essere un’email valida: è anche il tuo username." : undefined}
            >
              <Input
                id="username"
                name="username"
                type="email"
                autoComplete="email"
                inputMode="email"
                className={inputClass}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="tu@email.com"
                required
              />
            </Field>
          ) : null}

          {mode === "accedi" && pinAvailable ? (
            <div className="flex gap-2">
              <button
                type="button"
                className={`h-9 flex-1 rounded-xl text-sm font-medium ${
                  !usePin ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
                }`}
                onClick={() => setUsePin(false)}
              >
                Password
              </button>
              <button
                type="button"
                className={`h-9 flex-1 rounded-xl text-sm font-medium ${
                  usePin ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
                }`}
                onClick={() => setUsePin(true)}
              >
                PIN
              </button>
            </div>
          ) : null}

          {mode === "accedi" && usePin ? (
            <Field label="PIN" htmlFor="pin">
              <Input
                id="pin"
                name="pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                className={inputClass}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••"
              />
            </Field>
          ) : null}

          {(mode === "registrati" ||
            mode === "nuova-password" ||
            (mode === "accedi" && !usePin)) && (
            <Field
              label={mode === "nuova-password" ? "Nuova password" : "Password"}
              htmlFor="password"
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === "registrati" || mode === "nuova-password"
                    ? "new-password"
                    : "current-password"
                }
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          )}

          {mode === "registrati" || mode === "nuova-password" ? (
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

          {mode === "recupero" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Inserisci l’email dell’account. Riceverai (o scaricherai) un HTML con il link per
                impostare una nuova password.
              </p>
              <Field label="Email" htmlFor="recovery-lookup">
                <Input
                  id="recovery-lookup"
                  name="recovery-lookup"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className={inputClass}
                  value={recoveryLookup}
                  onChange={(event) => setRecoveryLookup(event.target.value)}
                  placeholder="tu@email.com"
                />
              </Field>
            </>
          ) : null}

          {mode === "nuova-password" ? (
            <p className="text-sm text-muted-foreground">
              Scegli una nuova password per riaprire la cassaforte. L’accesso con PIN verrà
              disabilitato e andrà riattivato dal menu account.
            </p>
          ) : null}

          {formError || errorMessage ? (
            <p className="text-sm text-destructive">{formError ?? errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand-strong px-4 text-base font-medium text-brand-foreground transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            {pending
              ? "Un attimo…"
              : mode === "registrati"
                ? "Crea account"
                : mode === "recupero"
                  ? "Invia recupero"
                  : mode === "nuova-password"
                    ? "Salva password"
                    : "Entra"}
          </button>

          {mode === "accedi" ? (
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => {
                setFormError(null);
                setMode("recupero");
              }}
            >
              Password dimenticata?
            </button>
          ) : null}

          {mode === "recupero" || mode === "nuova-password" ? (
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => {
                setFormError(null);
                clearRecoveryFromUrl();
                setRecoveryPayload(null);
                setMode(hasAccounts ? "accedi" : "registrati");
              }}
            >
              Torna all’accesso
            </button>
          ) : null}
        </form>
      </FadeSwap>

      {showImport ? (
        <div className="mt-8 border-t border-foreground/8 pt-6">
          <SqliteFileInput
            inputRef={fileRef}
            disabled={pending}
            onFile={(file) => void onImport(file)}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            Importa database
          </button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { KeyRound, LogOut, Download, Upload, Mail } from "lucide-react";
import { SqliteFileInput } from "@/components/sqlite-file-input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";

const inputClass = "h-11 rounded-2xl px-3.5";

export function AccountMenu() {
  const {
    user,
    logout,
    exportDatabase,
    importDatabase,
    enablePin,
    disablePin,
    linkEmail,
    unlinkEmail,
  } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!user) return null;

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      await importDatabase(file);
      toast.success("Database importato.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Importazione non riuscita.");
    }
  }

  async function onTogglePin() {
    if (!user) return;
    setFormError(null);
    if (user.pinEnabled) {
      setPending(true);
      try {
        await disablePin();
        toast.success("Accesso con PIN disabilitato.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Operazione non riuscita.");
      } finally {
        setPending(false);
      }
      return;
    }
    setPin("");
    setConfirmPin("");
    setPinOpen(true);
  }

  async function onSavePin(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      await enablePin(pin, confirmPin);
      setPinOpen(false);
      toast.success("Accesso con PIN abilitato.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Operazione non riuscita.");
    } finally {
      setPending(false);
    }
  }

  async function onSaveEmail(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      await linkEmail(email);
      setEmailOpen(false);
      toast.success("Email di recupero collegata.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Operazione non riuscita.");
    } finally {
      setPending(false);
    }
  }

  async function onUnlinkEmail() {
    setPending(true);
    try {
      await unlinkEmail();
      toast.success("Email di recupero rimossa.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operazione non riuscita.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.username}</p>
        {user.email && user.email !== user.username ? (
          <p className="truncate text-xs text-muted-foreground">Recupero: {user.email}</p>
        ) : null}
      </div>
      <SqliteFileInput inputRef={fileRef} onFile={(file) => void onImport(file)} />
      <ThemeToggle />
      <button
        type="button"
        disabled={pending}
        className="flex h-10 items-center gap-2 rounded-xl px-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        onClick={() => void onTogglePin()}
      >
        <KeyRound className="size-4" />
        {user.pinEnabled ? "Disabilita accesso PIN" : "Abilita accesso PIN"}
      </button>
      <button
        type="button"
        disabled={pending}
        className="flex h-10 items-center gap-2 rounded-xl px-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        onClick={() => {
          setFormError(null);
          setEmail(user.email ?? "");
          setEmailOpen(true);
        }}
      >
        <Mail className="size-4" />
        {user.email ? "Modifica email recupero" : "Collega email recupero"}
      </button>
      <button
        type="button"
        className="flex h-10 items-center gap-2 rounded-xl px-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => {
          exportDatabase();
          toast.success("File SQLite scaricato.");
        }}
      >
        <Download className="size-4" />
        Esporta file
      </button>
      <button
        type="button"
        className="flex h-10 items-center gap-2 rounded-xl px-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-4" />
        Importa file
      </button>
      <button
        type="button"
        className="flex h-10 items-center gap-2 rounded-xl px-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={logout}
      >
        <LogOut className="size-4" />
        Esci
      </button>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <form onSubmit={onSavePin} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Accesso con PIN</DialogTitle>
              <DialogDescription>
                Scegli un PIN di 4–6 cifre per sbloccare la cassaforte senza digitare la password.
              </DialogDescription>
            </DialogHeader>
            <Field label="PIN" htmlFor="account-pin">
              <Input
                id="account-pin"
                inputMode="numeric"
                autoComplete="off"
                className={inputClass}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••"
              />
            </Field>
            <Field label="Conferma PIN" htmlFor="account-pin-confirm">
              <Input
                id="account-pin-confirm"
                inputMode="numeric"
                autoComplete="off"
                className={inputClass}
                value={confirmPin}
                onChange={(event) =>
                  setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="••••"
              />
            </Field>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <DialogFooter>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-strong px-4 text-sm font-medium text-brand-foreground disabled:opacity-50"
              >
                Abilita PIN
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <form onSubmit={onSaveEmail} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Email di recupero</DialogTitle>
              <DialogDescription>
                Se dimentichi la password, potrai richiedere un messaggio HTML con il link per
                cambiarla usando questa email (di default è lo stesso username).
              </DialogDescription>
            </DialogHeader>
            <Field label="Email" htmlFor="account-email">
              <Input
                id="account-email"
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
              />
            </Field>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <DialogFooter className="gap-2 sm:justify-between">
              {user.email ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onUnlinkEmail().then(() => setEmailOpen(false))}
                  className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  Rimuovi
                </button>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-strong px-4 text-sm font-medium text-brand-foreground disabled:opacity-50"
              >
                Salva email
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

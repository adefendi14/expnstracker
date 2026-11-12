"use client";

import { useState, useSyncExternalStore } from "react";
import { Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getInstallPrompt,
  isInstalledPwa,
  isIosDevice,
  isIosSafari,
  subscribeInstallPrompt,
  subscribeInstalled,
  triggerInstallPrompt,
} from "@/lib/install-prompt";

function useInstalled() {
  return useSyncExternalStore(subscribeInstalled, isInstalledPwa, () => false);
}

function useNativePrompt() {
  return useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt, () => null);
}

function IosSteps() {
  return (
    <ol className="flex flex-col gap-2">
      <li className="flex items-center gap-3 rounded-2xl bg-muted/70 px-4 py-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
          1
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium">Condividi</p>
        <Share className="size-5 shrink-0 text-foreground" aria-hidden />
      </li>
      <li className="flex items-center gap-3 rounded-2xl bg-muted/70 px-4 py-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
          2
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium">Aggiungi a Home</p>
      </li>
      <li className="flex items-center gap-3 rounded-2xl bg-muted/70 px-4 py-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
          3
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium">Conferma</p>
      </li>
    </ol>
  );
}

export function InstallHomeButton() {
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const installed = useInstalled();
  const nativePrompt = useNativePrompt();
  const [helpOpen, setHelpOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!ready || installed) return null;

  const ios = isIosDevice();
  const iosSafari = isIosSafari();
  const label = ios ? "Aggiungi a Home" : "Installa";

  async function onClick() {
    if (ios) {
      setHelpOpen(true);
      return;
    }
    if (nativePrompt) {
      setBusy(true);
      const result = await triggerInstallPrompt();
      setBusy(false);
      if (result.outcome === "accepted") return;
      if (result.outcome === "unavailable") setHelpOpen(true);
      return;
    }
    setHelpOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="h-12 w-full rounded-2xl text-base"
        disabled={busy}
        onClick={() => void onClick()}
      >
        <Smartphone className="size-4" />
        {label}
      </Button>

      {ios ? (
        <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <SheetHeader>
              <SheetTitle>Aggiungi a Home</SheetTitle>
              <SheetDescription>
                {iosSafari ? "Tre passaggi in Safari." : "Apri la pagina in Safari."}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
              <IosSteps />
              <button
                type="button"
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand-strong px-4 text-sm font-medium text-brand-foreground"
                onClick={() => setHelpOpen(false)}
              >
                Ok
              </button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent className="rounded-3xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Installa</DialogTitle>
              <DialogDescription>Dal menu del browser.</DialogDescription>
            </DialogHeader>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="rounded-2xl bg-muted/70 px-4 py-3">Chrome / Edge → Installa app</li>
              <li className="rounded-2xl bg-muted/70 px-4 py-3">Android → Aggiungi a Home</li>
            </ul>
            <DialogFooter>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-strong px-4 text-sm font-medium text-brand-foreground"
                onClick={() => setHelpOpen(false)}
              >
                Ok
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

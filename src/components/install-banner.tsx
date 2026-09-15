"use client";

import { useState, useSyncExternalStore } from "react";
import { INSTALL_DISMISS_KEY } from "@/lib/types";

function isStandalone() {
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const legacy =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return media || legacy;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  const ready = window.setTimeout(onChange, 0);
  return () => {
    window.clearTimeout(ready);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot() {
  return localStorage.getItem(INSTALL_DISMISS_KEY) !== "1" && !isStandalone();
}

export function InstallBanner() {
  const storedVisible = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const [hidden, setHidden] = useState(false);

  if (!storedVisible || hidden) return null;

  return (
    <div className="mx-auto mb-4 w-full max-w-2xl px-4 md:px-8">
      <div className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/8">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Usa ExpnsTracker come app</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Su iPhone: Safari → Condividi → Aggiungi a Home. Si apre a schermo intero, senza Chrome di
            Safari.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground"
          onClick={() => {
            localStorage.setItem(INSTALL_DISMISS_KEY, "1");
            setHidden(true);
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}

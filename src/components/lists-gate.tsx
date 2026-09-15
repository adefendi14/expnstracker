"use client";

import { useEffect, useState } from "react";
import { ListsScreen } from "@/components/lists-screen";
import { StorageError } from "@/components/screen-states";
import { useStore } from "@/lib/store";
import type { ListKind } from "@/lib/types";

export function ListsGate() {
  const { status, errorMessage, resetStorage } = useStore();
  const [initialKind, setInitialKind] = useState<ListKind>("tutti");

  useEffect(() => {
    const tipo = new URLSearchParams(window.location.search).get("tipo");
    if (tipo === "debiti" || tipo === "crediti" || tipo === "spese" || tipo === "idee") {
      setInitialKind(tipo);
    }
  }, []);

  if (status === "error") {
    return <StorageError message={errorMessage ?? "Errore di lettura."} onReset={resetStorage} />;
  }
  return <ListsScreen initialKind={initialKind} />;
}

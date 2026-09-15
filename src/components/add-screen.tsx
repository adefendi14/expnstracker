"use client";

import { useEffect, useState } from "react";
import { QuickAddForm } from "@/components/quick-add-form";
import { StorageError } from "@/components/screen-states";
import { useStore } from "@/lib/store";

export function AddScreen() {
  const { status, errorMessage, resetStorage, data } = useStore();
  const [tipo, setTipo] = useState<string | undefined>();
  const [id, setId] = useState<string | undefined>();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setTipo(query.get("tipo") ?? undefined);
    setId(query.get("id") ?? undefined);
  }, []);

  if (status === "error") {
    return <StorageError message={errorMessage ?? "Errore di lettura."} onReset={resetStorage} />;
  }

  const ledger =
    (tipo === "debito" || tipo === "credito") && id
      ? data.ledger.find((item) => item.id === id)
      : undefined;
  const expense = tipo === "spesa" && id ? data.expenses.find((item) => item.id === id) : undefined;
  const idea = tipo === "idea" && id ? data.ideas.find((item) => item.id === id) : undefined;
  const initialTab =
    tipo === "spesa" ? "spesa" : tipo === "idea" ? "idea" : tipo === "debito" || tipo === "credito" ? "ledger" : "ledger";

  return <QuickAddForm initialTab={initialTab} ledger={ledger} expense={expense} idea={idea} />;
}

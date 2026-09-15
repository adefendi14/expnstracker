"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QuickAddForm } from "@/components/quick-add-form";
import { ScreenSkeleton, StorageError } from "@/components/screen-states";
import { useStore } from "@/lib/store";

function AddInner() {
  const { status, errorMessage, resetStorage, data } = useStore();
  const params = useSearchParams();
  const id = params.get("id");
  const tipo = params.get("tipo");

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

export default function AggiungiPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <AddInner />
    </Suspense>
  );
}

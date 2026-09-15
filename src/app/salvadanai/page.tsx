"use client";

import { PiggyBankScreen } from "@/components/piggy-banks";
import { StorageError } from "@/components/screen-states";
import { useStore } from "@/lib/store";

export default function SalvadanaiPage() {
  const { status, errorMessage, resetStorage } = useStore();
  if (status === "error") {
    return <StorageError message={errorMessage ?? "Errore di lettura."} onReset={resetStorage} />;
  }
  return <PiggyBankScreen />;
}

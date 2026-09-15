"use client";

import { ListsScreen } from "@/components/lists-screen";
import { StorageError } from "@/components/screen-states";
import { useStore } from "@/lib/store";
import type { ListKind } from "@/lib/types";

export function ListsGate({ initialKind }: { initialKind: ListKind }) {
  const { status, errorMessage, resetStorage } = useStore();
  if (status === "error") {
    return <StorageError message={errorMessage ?? "Errore di lettura."} onReset={resetStorage} />;
  }
  return <ListsScreen initialKind={initialKind} />;
}

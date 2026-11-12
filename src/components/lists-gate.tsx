"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ListsScreen } from "@/components/lists-screen";
import { StorageError } from "@/components/screen-states";
import { parseCronologiaQuery } from "@/lib/cronologia-query";
import { useStore } from "@/lib/store";

function ListsGateInner() {
  const { status, errorMessage, resetStorage } = useStore();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseCronologiaQuery(searchParams), [searchParams]);

  if (status === "error") {
    return <StorageError message={errorMessage ?? "Errore di lettura."} onReset={resetStorage} />;
  }

  return <ListsScreen initialKind={query.kind} initialStatus={query.status} />;
}

export function ListsGate() {
  return (
    <Suspense fallback={null}>
      <ListsGateInner />
    </Suspense>
  );
}

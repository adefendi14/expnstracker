"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ListsScreen } from "@/components/lists-screen";
import { ScreenSkeleton, StorageError } from "@/components/screen-states";
import { useStore } from "@/lib/store";
import type { ListKind } from "@/lib/types";

function ElencoInner() {
  const { status, errorMessage, resetStorage } = useStore();
  const params = useSearchParams();
  const tipo = params.get("tipo");
  const initialKind: ListKind =
    tipo === "debiti" || tipo === "crediti" || tipo === "spese" || tipo === "idee" ? tipo : "tutti";

  if (status === "loading") return <ScreenSkeleton />;
  if (status === "error") {
    return <StorageError message={errorMessage ?? "Errore di lettura."} onReset={resetStorage} />;
  }
  return <ListsScreen initialKind={initialKind} />;
}

export default function ElencoPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <ElencoInner />
    </Suspense>
  );
}

"use client";

import { DashboardScreen } from "@/components/dashboard-screen";
import { StorageError } from "@/components/screen-states";
import { useStore } from "@/lib/store";

export default function HomePage() {
  const { status, errorMessage, resetStorage } = useStore();
  if (status === "error") {
    return <StorageError message={errorMessage ?? "Errore di lettura."} onReset={resetStorage} />;
  }
  return <DashboardScreen />;
}

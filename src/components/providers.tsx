"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider, useStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { AuthScreen } from "@/components/auth-screen";
import { ScreenSkeleton, StorageError } from "@/components/screen-states";

function Gate({ children }: { children: ReactNode }) {
  const { authStatus, status, errorMessage, resetStorage } = useStore();

  if (authStatus === "loading") {
    return <ScreenSkeleton />;
  }

  if (authStatus === "error" && status === "error") {
    return (
      <StorageError
        message={errorMessage ?? "Errore di lettura del database."}
        onReset={() => {
          void resetStorage();
        }}
      />
    );
  }

  if (authStatus !== "ready") {
    return <AuthScreen />;
  }

  return <AppShell>{children}</AppShell>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <Gate>{children}</Gate>
      <Toaster position="top-center" theme="light" richColors={false} />
    </StoreProvider>
  );
}

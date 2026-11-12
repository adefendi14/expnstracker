"use client";

import type { ReactNode } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider, useStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { AuthScreen } from "@/components/auth-screen";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeColorMeta } from "@/components/theme-color-meta";
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

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-center"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      richColors={false}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <StoreProvider>
        <PwaRegister />
        <ThemeColorMeta />
        <Gate>{children}</Gate>
        <ThemedToaster />
      </StoreProvider>
    </ThemeProvider>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider, useStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { AuthScreen } from "@/components/auth-screen";
import { ScreenSwap } from "@/components/motion";
import { PwaRegister } from "@/components/pwa-register";
import { StorageError } from "@/components/screen-states";
import { CloseCelebrationProvider } from "@/components/close-celebration";
import { PrivacyProvider } from "@/components/privacy-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SESSION_KEY } from "@/lib/types";

function hasRecoveryParam() {
  if (typeof window === "undefined") return false;
  return Boolean(new URL(window.location.href).searchParams.get("recupero"));
}

function hasStoredSession() {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(SESSION_KEY));
}

function Gate({ children }: { children: ReactNode }) {
  const { authStatus, status, errorMessage, resetStorage, logout } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // A recovery link must land on the reset form even if a session was resumed.
    if (authStatus === "ready" && hasRecoveryParam()) {
      logout();
    }
  }, [authStatus, logout]);

  // Boot splash only happens on AuthScreen after login/register (`pending`).
  // Between tabs we soft-navigate (or quietly resume a stored session) — no BootLoading here.
  if (authStatus === "loading") {
    if (mounted && hasStoredSession()) {
      return (
        <ScreenSwap id="app">
          <AppShell>{children}</AppShell>
        </ScreenSwap>
      );
    }
    return <div className="h-dvh bg-background" aria-busy="true" />;
  }

  if (authStatus === "error" && status === "error") {
    return (
      <ScreenSwap id="error">
        <StorageError
          message={errorMessage ?? "Errore di lettura del database."}
          onReset={() => {
            void resetStorage();
          }}
        />
      </ScreenSwap>
    );
  }

  if (authStatus !== "ready" || hasRecoveryParam()) {
    return (
      <ScreenSwap id="auth">
        <AuthScreen />
      </ScreenSwap>
    );
  }

  return (
    <ScreenSwap id="app">
      <AppShell>{children}</AppShell>
    </ScreenSwap>
  );
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
    <ThemeProvider>
      <PrivacyProvider>
        <StoreProvider>
          <CloseCelebrationProvider>
            <PwaRegister />
            <Gate>{children}</Gate>
            <ThemedToaster />
          </CloseCelebrationProvider>
        </StoreProvider>
      </PrivacyProvider>
    </ThemeProvider>
  );
}

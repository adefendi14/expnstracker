"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
      <StoreProvider>
        <AppShell>{children}</AppShell>
        <Toaster position="top-center" richColors={false} />
      </StoreProvider>
    </ThemeProvider>
  );
}

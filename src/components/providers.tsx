"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
      <Toaster position="top-center" theme="light" richColors={false} />
    </StoreProvider>
  );
}

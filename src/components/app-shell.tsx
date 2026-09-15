"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, PiggyBank, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Riepilogo", icon: Home },
  { href: "/elenco", label: "Elenco", icon: List },
  { href: "/salvadanai", label: "Salvadanai", icon: PiggyBank },
  { href: "/aggiungi", label: "Aggiungi", icon: Plus },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-foreground/6 bg-card/80 px-4 py-8 backdrop-blur-xl md:flex">
        <div className="px-3">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            ExpnsTracker
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">I tuoi soldi, chiari.</p>
        </div>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto px-3 text-xs leading-5 text-muted-foreground">
          Tutto resta su questo dispositivo. Nessun account, nessuna nuvola.
        </p>
      </aside>

      <div className="flex min-h-dvh flex-col md:pl-60">
        <header className="sticky top-0 z-20 border-b border-foreground/6 bg-background/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl md:hidden">
          <p className="text-center text-[13px] font-semibold tracking-tight">ExpnsTracker</p>
        </header>
        <main className="flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-8">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/6 bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full",
                      active && "bg-foreground text-background"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

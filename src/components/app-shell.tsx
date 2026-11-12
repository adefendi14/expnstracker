"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { History, Home, PiggyBank, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/account-menu";
import { BrandMark } from "@/components/brand-mark";
import { PageTransition } from "@/components/motion";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { useStore } from "@/lib/store";

/** Trailing slashes match `trailingSlash: true` static export paths. */
const NAV = [
  { href: "/", label: "Riepilogo", icon: Home },
  { href: "/cronologia/", label: "Cronologia", icon: History },
  { href: "/persone/", label: "Persone", icon: Users },
  { href: "/salvadanai/", label: "Salvadanai", icon: PiggyBank },
  { href: "/aggiungi/", label: "Aggiungi", icon: Plus },
] as const;

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

function isActive(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useStore();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const hardNavTimerRef = useRef<number | null>(null);

  const clearPending = useEffectEvent(() => {
    setPendingHref(null);
  });

  useEffect(() => {
    clearPending();
    if (hardNavTimerRef.current !== null) {
      window.clearTimeout(hardNavTimerRef.current);
      hardNavTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (hardNavTimerRef.current !== null) {
        window.clearTimeout(hardNavTimerRef.current);
      }
    };
  }, []);

  const activePath = pendingHref ?? pathname;
  const activeIndex = Math.max(
    0,
    NAV.findIndex((item) => isActive(activePath, item.href))
  );
  const [liquidPulse, setLiquidPulse] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const scrollIdleTimerRef = useRef<number | null>(null);

  const onMainScroll = useEffectEvent(() => {
    const main = mainRef.current;
    if (!main) return;
    main.classList.add("is-scrolling");
    if (scrollIdleTimerRef.current !== null) {
      window.clearTimeout(scrollIdleTimerRef.current);
    }
    scrollIdleTimerRef.current = window.setTimeout(() => {
      main.classList.remove("is-scrolling");
      scrollIdleTimerRef.current = null;
    }, 700);
  });

  useEffect(() => {
    return () => {
      if (scrollIdleTimerRef.current !== null) {
        window.clearTimeout(scrollIdleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    function closeAccountMenu(event: PointerEvent | KeyboardEvent) {
      const menu = accountMenuRef.current;
      if (!menu?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") menu.open = false;
        return;
      }
      if (event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }
    document.addEventListener("pointerdown", closeAccountMenu);
    document.addEventListener("keydown", closeAccountMenu);
    return () => {
      document.removeEventListener("pointerdown", closeAccountMenu);
      document.removeEventListener("keydown", closeAccountMenu);
    };
  }, []);

  useEffect(() => {
    setLiquidPulse(true);
    const timer = window.setTimeout(() => setLiquidPulse(false), 420);
    return () => window.clearTimeout(timer);
  }, [activeIndex]);

  function go(href: string) {
    if (isActive(pathname, href)) return;
    setPendingHref(href);
    const target = normalizePath(href);
    // Soft-nav keeps the shell mounted (no boot splash between tabs).
    startTransition(() => {
      router.push(href, { scroll: false });
    });
    // If the URL never changes (static-export soft-nav stall), fall back once.
    if (hardNavTimerRef.current !== null) {
      window.clearTimeout(hardNavTimerRef.current);
    }
    hardNavTimerRef.current = window.setTimeout(() => {
      hardNavTimerRef.current = null;
      if (normalizePath(window.location.pathname) !== target) {
        window.location.assign(href);
      }
    }, 280);
  }

  const mobileNav = (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-5 pb-[max(1rem,calc(0.5rem+env(safe-area-inset-bottom)))] md:hidden"
      aria-label="Navigazione"
    >
      <ul
        className="pointer-events-auto relative grid w-[min(100%,22.5rem)] grid-cols-5 overflow-hidden rounded-full border border-white/40 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(255,255,255,0.08),0_10px_36px_rgba(0,0,0,0.2)] ring-1 ring-white/20 backdrop-blur-[28px] backdrop-saturate-200 supports-[backdrop-filter]:bg-white/10 dark:border-white/12 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.35),0_12px_40px_rgba(0,0,0,0.45)] dark:ring-white/8 dark:backdrop-saturate-150 dark:supports-[backdrop-filter]:bg-black/35"
        style={{
          background: "var(--glass-island)",
          borderColor: "var(--glass-border)",
        }}
      >
        <span
          aria-hidden
          className="liquid-tab-pill pointer-events-none absolute top-1 bottom-1 left-1 z-0 rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-md dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
          style={{
            width: "calc((100% - 0.5rem) / 5)",
            background: "var(--glass-pill)",
            borderColor: "var(--glass-pill-border)",
            transformOrigin:
              activeIndex === 0 ? "left center" : activeIndex === NAV.length - 1 ? "right center" : "center",
            transform: `translateX(calc(${activeIndex} * 100%)) scaleX(${liquidPulse ? 1.04 : 1}) scaleY(${liquidPulse ? 0.97 : 1})`,
          }}
        />
        {NAV.map((item) => {
          const active = isActive(activePath, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative z-10 min-w-0">
              <Link
                href={item.href}
                prefetch={false}
                onClick={(event) => {
                  if (isModifiedClick(event)) return;
                  event.preventDefault();
                  go(item.href);
                }}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 text-[10px] transition-colors duration-300 active:scale-95",
                  active
                    ? "font-semibold text-brand"
                    : "font-medium text-muted-foreground/65 hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4 shrink-0 transition-transform duration-300", active && "scale-110")} />
                <span className="max-w-full truncate leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-foreground/6 bg-card/80 px-4 py-8 backdrop-blur-xl md:flex">
        <div className="px-3">
          <BrandMark framed={false} className="size-9" size={36} />
        </div>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(activePath, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={(event) => {
                  if (isModifiedClick(event)) return;
                  event.preventDefault();
                  go(item.href);
                }}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-[color,background-color,transform,box-shadow] duration-300",
                  active
                    ? "border text-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,0,0,0.35)]"
                    : "text-muted-foreground/75 hover:bg-muted/60 hover:text-foreground"
                )}
                style={
                  active
                    ? {
                        background: "var(--glass-pill)",
                        borderColor: "var(--glass-pill-border)",
                      }
                    : undefined
                }
              >
                <Icon className={cn("size-4 transition-transform duration-300", active && "scale-110")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-muted/70 p-3">
          <div className="mb-2 flex justify-end">
            <PrivacyToggle className="size-9" />
          </div>
          <AccountMenu />
        </div>
      </aside>

      <div className="flex h-dvh flex-col md:pl-60">
        {/* Opaque pinned header (no glass blur) so iPhone notch icons stay sharp. */}
        <header className="relative z-20 shrink-0 border-b border-foreground/6 bg-background px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:hidden">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center">
              <BrandMark framed={false} className="size-8 shrink-0" size={32} />
            </div>
            <PrivacyToggle />
            <details ref={accountMenuRef} className="relative shrink-0">
              <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-foreground transition-transform duration-150 active:scale-95 [&::-webkit-details-marker]:hidden">
                {(user?.name ?? "U").slice(0, 1).toUpperCase()}
              </summary>
              <div className="absolute top-11 right-0 z-40 w-56 rounded-2xl bg-card p-3 shadow-lg ring-1 ring-foreground/8 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150">
                <AccountMenu />
              </div>
            </details>
          </div>
        </header>
        <div className="relative min-h-0 flex-1">
          {/* Thin fade under the header edge only — never over status-bar icons. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-background to-transparent md:hidden"
          />
          <main
            ref={mainRef}
            onScroll={onMainScroll}
            className="scrollbar-scroll-only h-full overflow-y-auto overscroll-y-contain pb-[calc(7.25rem+env(safe-area-inset-bottom))] md:pb-8"
          >
            <PageTransition pageKey={pathname}>{children}</PageTransition>
          </main>
        </div>
      </div>

      {portalReady ? createPortal(mobileNav, document.body) : mobileNav}
    </div>
  );
}

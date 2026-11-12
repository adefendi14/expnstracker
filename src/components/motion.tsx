"use client";

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** Remount page body on navigation so enter animations replay. */
export function PageTransition({
  children,
  pageKey,
}: {
  children: ReactNode;
  pageKey?: string;
}) {
  return (
    <div key={pageKey ?? "page"} className="contents">
      {children}
    </div>
  );
}

/** Crossfade when a panel/tab/filter key changes. */
export function FadeSwap({
  id,
  children,
  className,
  tone = "soft",
}: {
  id: string;
  children: ReactNode;
  className?: string;
  tone?: "soft" | "lift";
}) {
  return (
    <div
      key={id}
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-150 motion-safe:fill-mode-both",
        tone === "lift" && "motion-safe:slide-in-from-bottom-3",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Auth ↔ app shell (and similar full-screen gate swaps). */
export function ScreenSwap({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <div
      key={id}
      className="h-full motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-200 motion-safe:fill-mode-both"
    >
      {children}
    </div>
  );
}

/**
 * Light page/section enter. Content stays interactive immediately —
 * no skeleton gate (that made tab switches feel stuck for ~300ms+).
 */
export function EnterReveal({
  children,
  className,
  delay = 0,
  skeletonClassName: _skeletonClassName,
  skeleton: _skeleton,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  skeletonClassName?: string;
  /** Kept for call-site compatibility; unused (skeletons blocked tab UX). */
  skeleton?: ReactNode;
}) {
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setEntered(true);
      return;
    }

    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
    };
  }, []);

  return (
    <div
      className={cn(
        "min-w-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className
      )}
      style={
        {
          transitionDelay: entered ? `${Math.min(delay, 120)}ms` : "0ms",
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/** @deprecated alias — same enter behavior */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  skeletonClassName,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  skeletonClassName?: string;
}) {
  return (
    <EnterReveal className={className} delay={delay} skeletonClassName={skeletonClassName}>
      {children}
    </EnterReveal>
  );
}

/** Staggered list/card enter — capped so long lists stay snappy. */
export function StaggerItem({
  index,
  children,
  className,
  skeletonClassName,
  skeleton,
}: {
  index: number;
  children: ReactNode;
  className?: string;
  skeletonClassName?: string;
  skeleton?: ReactNode;
}) {
  return (
    <EnterReveal
      className={className}
      delay={Math.min(index, 6) * 16}
      skeletonClassName={skeletonClassName}
      skeleton={skeleton}
    >
      {children}
    </EnterReveal>
  );
}

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/privacy-provider";

export function PrivacyAmount({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { hidden } = usePrivacy();

  return (
    <span
      data-privacy-amount=""
      className={cn(
        "inline-block transition-[filter] duration-200",
        hidden && "select-none blur-[7px]",
        className
      )}
      aria-hidden={hidden || undefined}
      title={hidden ? "Importi nascosti" : undefined}
    >
      {children}
    </span>
  );
}

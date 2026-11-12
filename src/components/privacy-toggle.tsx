"use client";

import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/privacy-provider";

export function PrivacyToggle({ className }: { className?: string }) {
  const { hidden, toggle } = usePrivacy();

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[color,transform,background-color] duration-150 hover:bg-muted hover:text-foreground active:scale-95",
        hidden && "text-brand",
        className
      )}
      aria-label={hidden ? "Mostra importi" : "Nascondi importi"}
      aria-pressed={hidden}
    >
      {hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </button>
  );
}

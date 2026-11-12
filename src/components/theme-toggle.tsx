"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

function subscribe() {
  return () => undefined;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      className={
        className ??
        "flex h-10 w-full items-center gap-2 rounded-xl px-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      }
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Passa al tema chiaro" : "Passa al tema scuro"}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {dark ? "Tema chiaro" : "Tema scuro"}
    </button>
  );
}

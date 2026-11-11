"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

function setThemeColor(color: string) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const fromCss = getComputedStyle(root).getPropertyValue("--theme-color").trim();
    setThemeColor(fromCss || (resolvedTheme === "dark" ? "#121214" : "#f4f3ef"));
  }, [resolvedTheme]);

  return null;
}

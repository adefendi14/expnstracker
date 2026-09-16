"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/install-prompt";
import { withBase } from "@/lib/paths";

export function PwaRegister() {
  useEffect(() => {
    captureInstallPrompt();
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    const script = withBase("/sw.js");
    const scope = withBase("/");
    void navigator.serviceWorker.register(script, {
      scope,
      updateViaCache: "none",
    });
  }, []);
  return null;
}

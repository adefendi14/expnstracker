"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/install-prompt";
import { withBase } from "@/lib/paths";

export function PwaRegister() {
  useEffect(() => {
    captureInstallPrompt();
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register(withBase("/sw.js"));
  }, []);
  return null;
}

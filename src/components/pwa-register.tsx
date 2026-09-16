"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/install-prompt";
import { withBase } from "@/lib/paths";

export function PwaRegister() {
  useEffect(() => {
    captureInstallPrompt();
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register(withBase("/sw.js"), { updateViaCache: "none" });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);
  return null;
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function captureInstallPrompt() {
  if (typeof window === "undefined" || window.__expnsInstallCapture) return;
  window.__expnsInstallCapture = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export function subscribeInstallPrompt(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getInstallPrompt() {
  return deferredPrompt;
}

export async function triggerInstallPrompt() {
  if (!deferredPrompt) return { outcome: "unavailable" as const };
  const event = deferredPrompt;
  await event.prompt();
  const choice = await event.userChoice;
  deferredPrompt = null;
  notify();
  return choice;
}

export function isInstalledPwa() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(navigatorWithStandalone.standalone);
}

export function subscribeInstalled(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

export function isIosDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iPhone = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return iPhone || iPadOs;
}

export function isIosSafari() {
  if (!isIosDevice()) return false;
  const ua = window.navigator.userAgent;
  const isSafari = /Safari/i.test(ua);
  const isOther = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|OPT\//i.test(ua);
  return isSafari && !isOther;
}

declare global {
  interface Window {
    __expnsInstallCapture?: boolean;
  }
}

if (typeof window !== "undefined") {
  captureInstallPrompt();
}

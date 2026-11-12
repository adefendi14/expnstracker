"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "expnstracker.privacy";

type PrivacyContextValue = {
  hidden: boolean;
  toggle: () => void;
  setHidden: (hidden: boolean) => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

function subscribe() {
  return () => undefined;
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [hidden, setHiddenState] = useState(false);

  useEffect(() => {
    try {
      setHiddenState(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.privacy = hidden ? "on" : "off";
    try {
      localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
    } catch {
      // ignore
    }
  }, [hidden, mounted]);

  const setHidden = useCallback((next: boolean) => {
    setHiddenState(next);
  }, []);

  const toggle = useCallback(() => {
    setHiddenState((current) => !current);
  }, []);

  const value = useMemo(
    () => ({
      hidden: mounted ? hidden : false,
      toggle,
      setHidden,
    }),
    [hidden, mounted, setHidden, toggle]
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    throw new Error("usePrivacy must be used within PrivacyProvider");
  }
  return ctx;
}

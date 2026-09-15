"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  emptyData,
  STORAGE_KEY,
  type AppData,
  type Expense,
  type InvestmentIdea,
  type LedgerEntry,
  type PiggyBank,
} from "@/lib/types";
import { isThisMonth } from "@/lib/format";

type StoreStatus = "ready" | "error";

type Snapshot = {
  status: StoreStatus;
  errorMessage: string | null;
  data: AppData;
};

type StoreContextValue = {
  status: StoreStatus;
  errorMessage: string | null;
  data: AppData;
  resetStorage: () => void;
  addLedger: (entry: Omit<LedgerEntry, "id" | "createdAt" | "updatedAt">) => LedgerEntry;
  updateLedger: (id: string, patch: Partial<LedgerEntry>) => void;
  deleteLedger: (id: string) => void;
  addExpense: (entry: Omit<Expense, "id" | "createdAt" | "updatedAt">) => Expense;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addIdea: (entry: Omit<InvestmentIdea, "id" | "createdAt" | "updatedAt">) => InvestmentIdea;
  updateIdea: (id: string, patch: Partial<InvestmentIdea>) => void;
  deleteIdea: (id: string) => void;
  addPiggy: (
    entry: Omit<PiggyBank, "id" | "createdAt" | "updatedAt" | "current"> & { current?: number }
  ) => PiggyBank;
  updatePiggy: (id: string, patch: Partial<PiggyBank>) => void;
  deletePiggy: (id: string) => void;
  adjustPiggy: (id: string, delta: number) => void;
  totals: {
    openDebts: number;
    openCredits: number;
    piggyCurrent: number;
    piggyTarget: number;
    estimatedBalance: number;
    monthExpenses: number;
    piggyPercent: number;
  };
};

const StoreContext = createContext<StoreContextValue | null>(null);

const listeners = new Set<() => void>();
let snapshot: Snapshot | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function parseStored(raw: string | null): AppData {
  if (!raw) return emptyData();
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Formato dati non valido");
  }
  const candidate = parsed as Partial<AppData>;
  if (candidate.version !== 1) {
    throw new Error("Versione dati non supportata");
  }
  return {
    version: 1,
    ledger: Array.isArray(candidate.ledger) ? candidate.ledger : [],
    expenses: Array.isArray(candidate.expenses) ? candidate.expenses : [],
    ideas: Array.isArray(candidate.ideas) ? candidate.ideas : [],
    piggyBanks: Array.isArray(candidate.piggyBanks) ? candidate.piggyBanks : [],
  };
}

function readSnapshot(): Snapshot {
  if (snapshot) return snapshot;
  try {
    snapshot = {
      status: "ready",
      errorMessage: null,
      data: parseStored(localStorage.getItem(STORAGE_KEY)),
    };
  } catch (error) {
    snapshot = {
      status: "error",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Impossibile leggere i dati salvati su questo dispositivo.",
      data: emptyData(),
    };
  }
  return snapshot;
}

function persist(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  snapshot = { status: "ready", errorMessage: null, data };
  emit();
}

function persistError(data: AppData, message: string) {
  snapshot = { status: "error", errorMessage: message, data };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => {
    snapshot = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot(): Snapshot {
  return serverSnapshot;
}

const serverSnapshot: Snapshot = {
  status: "ready",
  errorMessage: null,
  data: emptyData(),
};

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);

  const commit = useCallback((updater: (value: AppData) => AppData) => {
    const base = readSnapshot().data;
    const next = updater(base);
    try {
      persist(next);
    } catch {
      persistError(next, "Impossibile salvare i dati. Controlla lo spazio del browser.");
    }
  }, []);

  const resetStorage = useCallback(() => {
    persist(emptyData());
  }, []);

  const addLedger: StoreContextValue["addLedger"] = useCallback(
    (entry) => {
      const stamp = nowIso();
      const created: LedgerEntry = { ...entry, id: createId(), createdAt: stamp, updatedAt: stamp };
      commit((value) => ({ ...value, ledger: [created, ...value.ledger] }));
      return created;
    },
    [commit]
  );

  const updateLedger: StoreContextValue["updateLedger"] = useCallback(
    (id, patch) => {
      commit((value) => ({
        ...value,
        ledger: value.ledger.map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item
        ),
      }));
    },
    [commit]
  );

  const deleteLedger: StoreContextValue["deleteLedger"] = useCallback(
    (id) => {
      commit((value) => ({
        ...value,
        ledger: value.ledger.filter((item) => item.id !== id),
      }));
    },
    [commit]
  );

  const addExpense: StoreContextValue["addExpense"] = useCallback(
    (entry) => {
      const stamp = nowIso();
      const created: Expense = { ...entry, id: createId(), createdAt: stamp, updatedAt: stamp };
      commit((value) => ({ ...value, expenses: [created, ...value.expenses] }));
      return created;
    },
    [commit]
  );

  const updateExpense: StoreContextValue["updateExpense"] = useCallback(
    (id, patch) => {
      commit((value) => ({
        ...value,
        expenses: value.expenses.map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item
        ),
      }));
    },
    [commit]
  );

  const deleteExpense: StoreContextValue["deleteExpense"] = useCallback(
    (id) => {
      commit((value) => ({
        ...value,
        expenses: value.expenses.filter((item) => item.id !== id),
      }));
    },
    [commit]
  );

  const addIdea: StoreContextValue["addIdea"] = useCallback(
    (entry) => {
      const stamp = nowIso();
      const created: InvestmentIdea = { ...entry, id: createId(), createdAt: stamp, updatedAt: stamp };
      commit((value) => ({ ...value, ideas: [created, ...value.ideas] }));
      return created;
    },
    [commit]
  );

  const updateIdea: StoreContextValue["updateIdea"] = useCallback(
    (id, patch) => {
      commit((value) => ({
        ...value,
        ideas: value.ideas.map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item
        ),
      }));
    },
    [commit]
  );

  const deleteIdea: StoreContextValue["deleteIdea"] = useCallback(
    (id) => {
      commit((value) => ({
        ...value,
        ideas: value.ideas.filter((item) => item.id !== id),
      }));
    },
    [commit]
  );

  const addPiggy: StoreContextValue["addPiggy"] = useCallback(
    (entry) => {
      const stamp = nowIso();
      const created: PiggyBank = {
        name: entry.name,
        target: entry.target,
        notes: entry.notes,
        current: entry.current ?? 0,
        id: createId(),
        createdAt: stamp,
        updatedAt: stamp,
      };
      commit((value) => ({ ...value, piggyBanks: [created, ...value.piggyBanks] }));
      return created;
    },
    [commit]
  );

  const updatePiggy: StoreContextValue["updatePiggy"] = useCallback(
    (id, patch) => {
      commit((value) => ({
        ...value,
        piggyBanks: value.piggyBanks.map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item
        ),
      }));
    },
    [commit]
  );

  const deletePiggy: StoreContextValue["deletePiggy"] = useCallback(
    (id) => {
      commit((value) => ({
        ...value,
        piggyBanks: value.piggyBanks.filter((item) => item.id !== id),
      }));
    },
    [commit]
  );

  const adjustPiggy: StoreContextValue["adjustPiggy"] = useCallback(
    (id, delta) => {
      commit((value) => ({
        ...value,
        piggyBanks: value.piggyBanks.map((item) => {
          if (item.id !== id) return item;
          const next = Math.max(0, Math.round((item.current + delta) * 100) / 100);
          return { ...item, current: next, updatedAt: nowIso() };
        }),
      }));
    },
    [commit]
  );

  const totals = useMemo(() => {
    const openDebts = current.data.ledger
      .filter((item) => item.direction === "debito" && !item.settled)
      .reduce((sum, item) => sum + item.amount, 0);
    const openCredits = current.data.ledger
      .filter((item) => item.direction === "credito" && !item.settled)
      .reduce((sum, item) => sum + item.amount, 0);
    const piggyCurrent = current.data.piggyBanks.reduce((sum, item) => sum + item.current, 0);
    const piggyTarget = current.data.piggyBanks.reduce((sum, item) => sum + item.target, 0);
    const monthExpenses = current.data.expenses
      .filter((item) => isThisMonth(item.date))
      .reduce((sum, item) => sum + item.amount, 0);
    const piggyPercent =
      piggyTarget > 0 ? Math.min(100, Math.round((piggyCurrent / piggyTarget) * 100)) : 0;
    return {
      openDebts,
      openCredits,
      piggyCurrent,
      piggyTarget,
      estimatedBalance: piggyCurrent + openCredits - openDebts,
      monthExpenses,
      piggyPercent,
    };
  }, [current.data]);

  const value: StoreContextValue = {
    status: current.status,
    errorMessage: current.errorMessage,
    data: current.data,
    resetStorage,
    addLedger,
    updateLedger,
    deleteLedger,
    addExpense,
    updateExpense,
    deleteExpense,
    addIdea,
    updateIdea,
    deleteIdea,
    addPiggy,
    updatePiggy,
    deletePiggy,
    adjustPiggy,
    totals,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore deve essere usato dentro StoreProvider");
  }
  return context;
}

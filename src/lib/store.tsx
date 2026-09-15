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
  SESSION_KEY,
  STORAGE_KEY,
  type AppData,
  type Expense,
  type InvestmentIdea,
  type LedgerEntry,
  type PiggyBank,
  type UserAccount,
} from "@/lib/types";
import { isThisMonth, ledgerPaid, ledgerRemaining } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  countUsers,
  deleteExpenseRow,
  deleteIdeaRow,
  deleteLedgerRow,
  deletePiggyRow,
  findUserAuth,
  findUserById,
  insertExpense,
  insertIdea,
  insertLedger,
  insertLegacyData,
  insertPiggy,
  insertUser,
  loadUserData,
  updateExpenseRow,
  updateIdeaRow,
  updateLedgerRow,
  updatePiggyRow,
} from "@/lib/queries";
import { exportSqliteBytes, openSqlite, persist, replaceSqlite, wipeSqlite } from "@/lib/sqlite";

export type AuthStatus = "loading" | "signedOut" | "ready" | "error";
export type StoreStatus = "ready" | "error";

type Snapshot = {
  authStatus: AuthStatus;
  status: StoreStatus;
  errorMessage: string | null;
  user: UserAccount | null;
  hasAccounts: boolean;
  data: AppData;
};

type RegisterInput = {
  name: string;
  username: string;
  password: string;
};

type StoreContextValue = {
  authStatus: AuthStatus;
  status: StoreStatus;
  errorMessage: string | null;
  user: UserAccount | null;
  hasAccounts: boolean;
  data: AppData;
  register: (input: RegisterInput) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  exportDatabase: () => void;
  importDatabase: (file: File) => Promise<void>;
  resetStorage: () => Promise<void>;
  addLedger: (
    entry: Omit<LedgerEntry, "id" | "createdAt" | "updatedAt" | "paid"> & { paid?: number }
  ) => LedgerEntry;
  updateLedger: (id: string, patch: Partial<LedgerEntry>) => void;
  deleteLedger: (id: string) => void;
  adjustLedgerPaid: (id: string, delta: number) => void;
  adjustLedgerTarget: (id: string, delta: number) => void;
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
const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,32}$/;

const listeners = new Set<() => void>();
let snapshot: Snapshot = {
  authStatus: "loading",
  status: "ready",
  errorMessage: null,
  user: null,
  hasAccounts: false,
  data: emptyData(),
};
let booting = false;

function emit() {
  for (const listener of listeners) listener();
}

function setSnapshot(next: Snapshot) {
  snapshot = next;
  emit();
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

function parseLegacy(raw: string | null): AppData | null {
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as Partial<AppData>;
  if (candidate.version !== 1) return null;
  return {
    version: 1,
    ledger: Array.isArray(candidate.ledger) ? candidate.ledger : [],
    expenses: Array.isArray(candidate.expenses) ? candidate.expenses : [],
    ideas: Array.isArray(candidate.ideas) ? candidate.ideas : [],
    piggyBanks: Array.isArray(candidate.piggyBanks) ? candidate.piggyBanks : [],
  };
}

function requireUser() {
  if (!snapshot.user) {
    throw new Error("Devi accedere per modificare i dati.");
  }
  return snapshot.user;
}

function refreshUser(user: UserAccount) {
  setSnapshot({
    authStatus: "ready",
    status: "ready",
    errorMessage: null,
    user,
    hasAccounts: countUsers() > 0,
    data: loadUserData(user.id),
  });
}

function signedOutSnapshot(message: string | null = null): Snapshot {
  return {
    authStatus: message ? "error" : "signedOut",
    status: message ? "error" : "ready",
    errorMessage: message,
    user: null,
    hasAccounts: countUsers() > 0,
    data: emptyData(),
  };
}

async function persistOrThrow() {
  try {
    await persist();
  } catch {
    setSnapshot({
      ...snapshot,
      status: "error",
      errorMessage: "Impossibile salvare il file SQLite su questo dispositivo.",
    });
    throw new Error("Impossibile salvare il file SQLite su questo dispositivo.");
  }
}

async function boot() {
  if (booting) return;
  booting = true;
  try {
    await openSqlite();
    const sessionId = localStorage.getItem(SESSION_KEY);
    const user = sessionId ? findUserById(sessionId) : undefined;
    if (user) {
      refreshUser(user);
    } else {
      localStorage.removeItem(SESSION_KEY);
      setSnapshot(signedOutSnapshot());
    }
  } catch (error) {
    setSnapshot({
      authStatus: "error",
      status: "error",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Impossibile aprire il database SQLite su questo dispositivo.",
      user: null,
      hasAccounts: false,
      data: emptyData(),
    });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void boot();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

const serverSnapshot: Snapshot = {
  authStatus: "loading",
  status: "ready",
  errorMessage: null,
  user: null,
  hasAccounts: false,
  data: emptyData(),
};

function normalizeUsername(value: string) {
  return value.trim();
}

function validateCredentials(name: string, username: string, password: string) {
  if (name.trim().length < 2) {
    throw new Error("Inserisci il nome (almeno 2 caratteri).");
  }
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Username: 3–32 caratteri, lettere, numeri, punto o underscore.");
  }
  if (password.length < 6) {
    throw new Error("La password deve avere almeno 6 caratteri.");
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);

  const register = useCallback(async ({ name, username, password }: RegisterInput) => {
    const displayName = name.trim();
    const handle = normalizeUsername(username);
    validateCredentials(displayName, handle, password);
    if (findUserAuth(handle)) {
      throw new Error("Questo username è già usato.");
    }
    const stamp = nowIso();
    const secret = await hashPassword(password);
    const user: UserAccount = {
      id: createId(),
      name: displayName,
      username: handle,
      createdAt: stamp,
    };
    insertUser({
      id: user.id,
      name: user.name,
      username: user.username,
      passwordSalt: secret.salt,
      passwordHash: secret.hash,
      createdAt: stamp,
    });
    if (countUsers() === 1) {
      try {
        const legacy = parseLegacy(localStorage.getItem(STORAGE_KEY));
        if (
          legacy &&
          legacy.ledger.length + legacy.expenses.length + legacy.ideas.length + legacy.piggyBanks.length > 0
        ) {
          insertLegacyData(user.id, legacy);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Keep the new account even if the old LocalStorage blob is unreadable.
      }
    }
    localStorage.setItem(SESSION_KEY, user.id);
    await persistOrThrow();
    refreshUser(user);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const handle = normalizeUsername(username);
    const row = findUserAuth(handle);
    if (!row || !(await verifyPassword(password, row.password_salt, row.password_hash))) {
      throw new Error("Username o password non corretti.");
    }
    const user = findUserById(row.id);
    if (!user) {
      throw new Error("Account non trovato.");
    }
    localStorage.setItem(SESSION_KEY, user.id);
    refreshUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSnapshot(signedOutSnapshot());
  }, []);

  const exportDatabase = useCallback(() => {
    const bytes = exportSqliteBytes();
    const blob = new Blob([bytes as BlobPart], { type: "application/vnd.sqlite3" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expnstracker.sqlite";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  const importDatabase = useCallback(async (file: File) => {
    const buffer = new Uint8Array(await file.arrayBuffer());
    await replaceSqlite(buffer);
    const sessionId = localStorage.getItem(SESSION_KEY);
    const user = sessionId ? findUserById(sessionId) : undefined;
    if (user) {
      refreshUser(user);
    } else {
      localStorage.removeItem(SESSION_KEY);
      setSnapshot(signedOutSnapshot());
    }
  }, []);

  const resetStorage = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(STORAGE_KEY);
    await wipeSqlite();
    setSnapshot(signedOutSnapshot());
  }, []);

  const commitUser = useCallback(
    (updater: (userId: string, data: AppData) => void) => {
      const user = requireUser();
      updater(user.id, snapshot.data);
      persist().catch(() => {
        setSnapshot({
          ...snapshot,
          status: "error",
          errorMessage: "Impossibile salvare il file SQLite su questo dispositivo.",
        });
      });
      refreshUser(user);
    },
    []
  );

  const addLedger: StoreContextValue["addLedger"] = useCallback(
    (entry) => {
      const stamp = nowIso();
      const created: LedgerEntry = {
        ...entry,
        paid: entry.paid ?? 0,
        id: createId(),
        createdAt: stamp,
        updatedAt: stamp,
      };
      commitUser((userId) => insertLedger(userId, created));
      return created;
    },
    [commitUser]
  );

  const updateLedger: StoreContextValue["updateLedger"] = useCallback(
    (id, patch) => {
      commitUser((userId, data) => {
        const currentItem = data.ledger.find((item) => item.id === id);
        if (!currentItem) return;
        const next: LedgerEntry = {
          ...currentItem,
          ...patch,
          paid: patch.paid ?? currentItem.paid ?? 0,
          updatedAt: nowIso(),
        };
        if (patch.settled === true && patch.paid === undefined) {
          next.paid = next.amount;
        }
        updateLedgerRow(userId, id, next);
      });
    },
    [commitUser]
  );

  const deleteLedger: StoreContextValue["deleteLedger"] = useCallback(
    (id) => {
      commitUser((userId) => deleteLedgerRow(userId, id));
    },
    [commitUser]
  );

  const adjustLedgerPaid: StoreContextValue["adjustLedgerPaid"] = useCallback(
    (id, delta) => {
      commitUser((userId, data) => {
        const currentItem = data.ledger.find((item) => item.id === id);
        if (!currentItem) return;
        const paid = Math.max(
          0,
          Math.min(currentItem.amount, Math.round((ledgerPaid(currentItem) + delta) * 100) / 100)
        );
        updateLedgerRow(userId, id, {
          ...currentItem,
          paid,
          settled: paid >= currentItem.amount,
          updatedAt: nowIso(),
        });
      });
    },
    [commitUser]
  );

  const adjustLedgerTarget: StoreContextValue["adjustLedgerTarget"] = useCallback(
    (id, delta) => {
      commitUser((userId, data) => {
        const currentItem = data.ledger.find((item) => item.id === id);
        if (!currentItem) return;
        const amount = Math.max(
          ledgerPaid(currentItem),
          Math.round((currentItem.amount + delta) * 100) / 100
        );
        const paid = ledgerPaid(currentItem);
        updateLedgerRow(userId, id, {
          ...currentItem,
          amount,
          paid,
          settled: paid >= amount,
          updatedAt: nowIso(),
        });
      });
    },
    [commitUser]
  );

  const addExpense: StoreContextValue["addExpense"] = useCallback(
    (entry) => {
      const stamp = nowIso();
      const created: Expense = { ...entry, id: createId(), createdAt: stamp, updatedAt: stamp };
      commitUser((userId) => insertExpense(userId, created));
      return created;
    },
    [commitUser]
  );

  const updateExpense: StoreContextValue["updateExpense"] = useCallback(
    (id, patch) => {
      commitUser((userId, data) => {
        const currentItem = data.expenses.find((item) => item.id === id);
        if (!currentItem) return;
        updateExpenseRow(userId, id, { ...currentItem, ...patch, updatedAt: nowIso() });
      });
    },
    [commitUser]
  );

  const deleteExpense: StoreContextValue["deleteExpense"] = useCallback(
    (id) => {
      commitUser((userId) => deleteExpenseRow(userId, id));
    },
    [commitUser]
  );

  const addIdea: StoreContextValue["addIdea"] = useCallback(
    (entry) => {
      const stamp = nowIso();
      const created: InvestmentIdea = { ...entry, id: createId(), createdAt: stamp, updatedAt: stamp };
      commitUser((userId) => insertIdea(userId, created));
      return created;
    },
    [commitUser]
  );

  const updateIdea: StoreContextValue["updateIdea"] = useCallback(
    (id, patch) => {
      commitUser((userId, data) => {
        const currentItem = data.ideas.find((item) => item.id === id);
        if (!currentItem) return;
        updateIdeaRow(userId, id, { ...currentItem, ...patch, updatedAt: nowIso() });
      });
    },
    [commitUser]
  );

  const deleteIdea: StoreContextValue["deleteIdea"] = useCallback(
    (id) => {
      commitUser((userId) => deleteIdeaRow(userId, id));
    },
    [commitUser]
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
      commitUser((userId) => insertPiggy(userId, created));
      return created;
    },
    [commitUser]
  );

  const updatePiggy: StoreContextValue["updatePiggy"] = useCallback(
    (id, patch) => {
      commitUser((userId, data) => {
        const currentItem = data.piggyBanks.find((item) => item.id === id);
        if (!currentItem) return;
        updatePiggyRow(userId, id, { ...currentItem, ...patch, updatedAt: nowIso() });
      });
    },
    [commitUser]
  );

  const deletePiggy: StoreContextValue["deletePiggy"] = useCallback(
    (id) => {
      commitUser((userId) => deletePiggyRow(userId, id));
    },
    [commitUser]
  );

  const adjustPiggy: StoreContextValue["adjustPiggy"] = useCallback(
    (id, delta) => {
      commitUser((userId, data) => {
        const currentItem = data.piggyBanks.find((item) => item.id === id);
        if (!currentItem) return;
        const next = Math.max(0, Math.round((currentItem.current + delta) * 100) / 100);
        updatePiggyRow(userId, id, { ...currentItem, current: next, updatedAt: nowIso() });
      });
    },
    [commitUser]
  );

  const totals = useMemo(() => {
    const openDebts = current.data.ledger
      .filter((item) => item.direction === "debito" && !item.settled)
      .reduce((sum, item) => sum + ledgerRemaining(item), 0);
    const openCredits = current.data.ledger
      .filter((item) => item.direction === "credito" && !item.settled)
      .reduce((sum, item) => sum + ledgerRemaining(item), 0);
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
      estimatedBalance: openCredits - openDebts,
      monthExpenses,
      piggyPercent,
    };
  }, [current.data]);

  const value: StoreContextValue = {
    authStatus: current.authStatus,
    status: current.status,
    errorMessage: current.errorMessage,
    user: current.user,
    hasAccounts: current.hasAccounts,
    data: current.data,
    register,
    login,
    logout,
    exportDatabase,
    importDatabase,
    resetStorage,
    addLedger,
    updateLedger,
    deleteLedger,
    adjustLedgerPaid,
    adjustLedgerTarget,
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

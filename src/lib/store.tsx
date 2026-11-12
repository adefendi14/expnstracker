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
import {
  isLedgerPayment,
  isThisMonth,
  ledgerIsClosed,
  ledgerPaid,
  ledgerRemaining,
  normalizeLedgerTitle,
} from "@/lib/format";
import { EXPORT_DATABASE_MIME } from "@/lib/import-file";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  countUsers,
  deleteExpenseRow,
  deleteIdeaRow,
  deleteLedgerRow,
  deletePiggyRow,
  deleteRelatedLedgerRows,
  findUserAuth,
  findUserById,
  insertExpense,
  isPinEnabledForUsername,
  insertIdea,
  insertLedger,
  insertLegacyData,
  insertLifecycleEvent,
  insertPiggy,
  insertUser,
  isLedgerTitleTaken,
  loadUserData,
  renamePerson as renamePersonRow,
  updateExpenseRow,
  updateIdeaRow,
  updateLedgerRow,
  updatePiggyRow,
} from "@/lib/queries";
import { withBase } from "@/lib/paths";
import { newUuid } from "@/lib/uuid";
import {
  exportSqliteBytes,
  installPlaintextSeed,
  lockVault,
  openSqlite,
  persist,
  prefetchSqliteRuntime,
  clearAccountEmail,
  completePasswordRecovery,
  disablePinUnlock,
  enablePinUnlock,
  linkAccountEmail,
  preparePasswordRecovery,
  provisionUserVault,
  replaceSqlite,
  resumeVaultSession,
  runDirectorySql,
  unlockUserVault,
  unlockUserVaultWithPin,
} from "@/lib/sqlite";
import {
  buildRecoveryUrl,
  dispatchRecoveryEmail,
  isValidEmail,
  isValidPin,
  normalizeEmail,
  type RecoveryDispatchResult,
} from "@/lib/account-security";

const TEST_SEED_USER_ID = "user-test-andrea";
const TEST_SEED_MARKER_KEY = "expnstracker.seed";
const TEST_SEED_MARKER = "test-2-encrypted";
const TEST_SEED_PARAM = "seed";
const TEST_SEED_VALUE = "test";
/** Known password used only when installing the local encrypted test seed. */
export const TEST_SEED_PASSWORD = "password";

async function loadTestSeedDatabase() {
  const response = await fetch(withBase("/seed/expnstracker-test.sqlite"));
  if (!response.ok) {
    throw new Error("Impossibile scaricare i dati di test.");
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(STORAGE_KEY);
  await installPlaintextSeed(buffer, TEST_SEED_PASSWORD);
  // Align directory password verifier with the wrap password so unlock works cold.
  const secret = await hashPassword(TEST_SEED_PASSWORD);
  runDirectorySql(
    "UPDATE users SET username = ?, password_salt = ?, password_hash = ? WHERE id = ?",
    ["test@example.com", secret.salt, secret.hash, TEST_SEED_USER_ID]
  );
  await persist();
  localStorage.setItem(SESSION_KEY, TEST_SEED_USER_ID);
  localStorage.setItem(TEST_SEED_MARKER_KEY, TEST_SEED_MARKER);
}

async function applyTestSeedIfNeeded() {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const force = url.searchParams.get(TEST_SEED_PARAM) === TEST_SEED_VALUE;
  const alreadySeeded = localStorage.getItem(TEST_SEED_MARKER_KEY) === TEST_SEED_MARKER;
  if (!force && alreadySeeded) return false;

  await loadTestSeedDatabase();

  if (force) {
    url.searchParams.delete(TEST_SEED_PARAM);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
  return true;
}

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
  email?: string;
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
  loginWithPin: (username: string, pin: string) => Promise<void>;
  logout: () => void;
  isPinLoginAvailable: (username: string) => boolean;
  enablePin: (pin: string, confirmPin: string) => Promise<void>;
  disablePin: () => Promise<void>;
  linkEmail: (email: string) => Promise<void>;
  unlinkEmail: () => Promise<void>;
  requestPasswordRecovery: (usernameOrEmail: string) => Promise<RecoveryDispatchResult>;
  finishPasswordRecovery: (
    userId: string,
    token: string,
    password: string,
    confirm: string
  ) => Promise<void>;
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
  extinguishLedger: (id: string) => void;
  reopenLedger: (id: string) => void;
  isLedgerTitleAvailable: (title: string, exceptId?: string) => boolean;
  addExpense: (
    entry: Omit<Expense, "id" | "createdAt" | "updatedAt" | "personId" | "completed"> & {
      person?: string;
      completed?: boolean;
    }
  ) => Expense;
  updateExpense: (id: string, patch: Partial<Expense> & { person?: string | null }) => void;
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
  renamePerson: (id: string, name: string) => void;
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

function extinguishLedgerInDb(userId: string, currentItem: LedgerEntry, ledger: LedgerEntry[]) {
  const remaining = ledgerRemaining(currentItem, ledger);
  if (remaining <= 0) return;
  const stamp = nowIso();
  insertLedger(userId, {
    id: createId(),
    title: `${currentItem.title} · Estinzione`,
    direction: currentItem.direction,
    person: currentItem.person,
    personId: currentItem.personId,
    amount: remaining,
    paid: 0,
    notes: "Estinzione",
    settled: true,
    relatedLedgerId: currentItem.id,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

function reopenLedgerInDb(userId: string, currentItem: LedgerEntry) {
  const stamp = nowIso();
  deleteRelatedLedgerRows(userId, currentItem.id);
  updateLedgerRow(
    userId,
    currentItem.id,
    { ...currentItem, settled: false, paid: 0, updatedAt: stamp },
    currentItem
  );
  if (currentItem.personId) {
    insertLifecycleEvent(userId, {
      personId: currentItem.personId,
      kind: "apertura",
      direction: currentItem.direction,
      amount: currentItem.amount,
      ledgerId: currentItem.id,
      notes: "Riapertura",
      at: stamp,
    });
  }
}

function createId() {
  return newUuid();
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
    people: [],
    events: [],
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
  prefetchSqliteRuntime();
  try {
    await openSqlite();
    const seeded = await applyTestSeedIfNeeded();
    if (seeded) {
      const user = findUserById(TEST_SEED_USER_ID);
      if (user) {
        refreshUser(user);
        return;
      }
    }
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      const resumed = await resumeVaultSession(sessionId);
      const user = findUserById(sessionId);
      if (resumed && user) {
        refreshUser(user);
        return;
      }
    }
    localStorage.removeItem(SESSION_KEY);
    await lockVault();
    setSnapshot(signedOutSnapshot());
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

if (typeof window !== "undefined") {
  void boot();
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
  return normalizeEmail(value);
}

function validateCredentials(name: string, username: string, password: string) {
  if (name.trim().length < 2) {
    throw new Error("Inserisci il nome (almeno 2 caratteri).");
  }
  if (!isValidEmail(username)) {
    throw new Error("Lo username deve essere un’email valida.");
  }
  if (password.length < 6) {
    throw new Error("La password deve avere almeno 6 caratteri.");
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);

  const register = useCallback(async ({ name, username, password, email }: RegisterInput) => {
    const displayName = name.trim();
    const handle = normalizeUsername(username);
    validateCredentials(displayName, handle, password);
    if (findUserAuth(handle)) {
      throw new Error("Questa email è già usata.");
    }
    const stamp = nowIso();
    const secret = await hashPassword(password);
    const userId = createId();
    insertUser({
      id: userId,
      name: displayName,
      username: handle,
      passwordSalt: secret.salt,
      passwordHash: secret.hash,
      createdAt: stamp,
    });
    await provisionUserVault(userId, password);
    // Username is the account email; always enable recovery on that address.
    await linkAccountEmail(userId, email?.trim() ? normalizeEmail(email) : handle);
    if (countUsers() === 1) {
      try {
        const legacy = parseLegacy(localStorage.getItem(STORAGE_KEY));
        if (
          legacy &&
          legacy.ledger.length + legacy.expenses.length + legacy.ideas.length + legacy.piggyBanks.length > 0
        ) {
          insertLegacyData(userId, legacy);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Keep the new account even if the old LocalStorage blob is unreadable.
      }
    }
    localStorage.setItem(SESSION_KEY, userId);
    await persistOrThrow();
    const user = findUserById(userId);
    if (!user) throw new Error("Account non trovato dopo la registrazione.");
    refreshUser(user);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const handle = normalizeUsername(username);
    const row = findUserAuth(handle);
    if (!row || !(await verifyPassword(password, row.password_salt, row.password_hash))) {
      throw new Error("Email o password non corretti.");
    }
    const user = findUserById(row.id);
    if (!user) {
      throw new Error("Account non trovato.");
    }
    await unlockUserVault(user.id, password);
    localStorage.setItem(SESSION_KEY, user.id);
    refreshUser(user);
  }, []);

  const loginWithPin = useCallback(async (username: string, pin: string) => {
    const handle = normalizeUsername(username);
    if (!isValidPin(pin)) {
      throw new Error("Il PIN deve avere da 4 a 6 cifre.");
    }
    const row = findUserAuth(handle);
    if (!row) {
      throw new Error("Email o PIN non corretti.");
    }
    const user = findUserById(row.id);
    if (!user) {
      throw new Error("Account non trovato.");
    }
    await unlockUserVaultWithPin(user.id, pin);
    localStorage.setItem(SESSION_KEY, user.id);
    refreshUser(findUserById(user.id) ?? user);
  }, []);

  const isPinLoginAvailable = useCallback((username: string) => {
    try {
      return isPinEnabledForUsername(normalizeUsername(username));
    } catch {
      return false;
    }
  }, []);

  const enablePin = useCallback(async (pin: string, confirmPin: string) => {
    const user = requireUser();
    if (!isValidPin(pin)) {
      throw new Error("Il PIN deve avere da 4 a 6 cifre.");
    }
    if (pin !== confirmPin) {
      throw new Error("I PIN non coincidono.");
    }
    await enablePinUnlock(user.id, pin);
    await persistOrThrow();
    refreshUser(findUserById(user.id) ?? user);
  }, []);

  const disablePin = useCallback(async () => {
    const user = requireUser();
    await disablePinUnlock(user.id);
    await persistOrThrow();
    refreshUser(findUserById(user.id) ?? user);
  }, []);

  const linkEmail = useCallback(async (email: string) => {
    const user = requireUser();
    await linkAccountEmail(user.id, email);
    await persistOrThrow();
    refreshUser(findUserById(user.id) ?? user);
  }, []);

  const unlinkEmail = useCallback(async () => {
    const user = requireUser();
    await clearAccountEmail(user.id);
    await persistOrThrow();
    refreshUser(findUserById(user.id) ?? user);
  }, []);

  const requestPasswordRecovery = useCallback(async (usernameOrEmail: string) => {
    const prepared = await preparePasswordRecovery(usernameOrEmail);
    const recoveryUrl = buildRecoveryUrl(prepared.userId, prepared.token);
    return dispatchRecoveryEmail({
      to: prepared.email,
      name: prepared.name,
      username: prepared.username,
      recoveryUrl,
    });
  }, []);

  const finishPasswordRecovery = useCallback(
    async (userId: string, token: string, password: string, confirm: string) => {
      if (password !== confirm) {
        throw new Error("Le password non coincidono.");
      }
      if (password.length < 6) {
        throw new Error("La password deve avere almeno 6 caratteri.");
      }
      await completePasswordRecovery(userId, token, password);
      localStorage.setItem(SESSION_KEY, userId);
      const user = findUserById(userId);
      if (!user) {
        throw new Error("Account non trovato dopo il recupero.");
      }
      refreshUser(user);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    void lockVault();
    setSnapshot(signedOutSnapshot());
  }, []);

  const exportDatabase = useCallback(() => {
    const bytes = exportSqliteBytes();
    const blob = new Blob([bytes as BlobPart], { type: EXPORT_DATABASE_MIME });
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
    localStorage.removeItem(TEST_SEED_MARKER_KEY);
    await loadTestSeedDatabase();
    const user = findUserById(TEST_SEED_USER_ID);
    if (user) {
      refreshUser(user);
    } else {
      setSnapshot(signedOutSnapshot());
    }
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

  const isLedgerTitleAvailable: StoreContextValue["isLedgerTitleAvailable"] = useCallback(
    (title, exceptId) => {
      if (!current.user) return false;
      return !isLedgerTitleTaken(current.user.id, title, exceptId);
    },
    [current.user]
  );

  const addLedger: StoreContextValue["addLedger"] = useCallback(
    (entry) => {
      const user = requireUser();
      const stamp = nowIso();
      const title = normalizeLedgerTitle(entry.title);
      if (!title) {
        throw new Error("Inserisci un titolo univoco.");
      }
      if (isLedgerTitleTaken(user.id, title)) {
        throw new Error("Titolo già usato. Scegline uno univoco.");
      }
      const created: LedgerEntry = {
        ...entry,
        title,
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
        if (!currentItem || isLedgerPayment(currentItem)) return;

        if (patch.settled === true) {
          extinguishLedgerInDb(userId, currentItem, data.ledger);
          return;
        }

        if (patch.settled === false) {
          reopenLedgerInDb(userId, currentItem);
          return;
        }

        if (patch.title && isLedgerTitleTaken(userId, patch.title, id)) {
          throw new Error("Titolo già usato. Scegline uno univoco.");
        }

        const next: LedgerEntry = {
          ...currentItem,
          ...patch,
          title: patch.title !== undefined ? normalizeLedgerTitle(patch.title) : currentItem.title,
          paid: currentItem.paid ?? 0,
          settled: currentItem.settled,
          relatedLedgerId: currentItem.relatedLedgerId,
          updatedAt: nowIso(),
        };
        updateLedgerRow(userId, id, next, currentItem);
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
        if (!currentItem || isLedgerPayment(currentItem) || delta === 0) return;
        const paid = ledgerPaid(currentItem, data.ledger);
        const remaining = ledgerRemaining(currentItem, data.ledger);
        if (delta > 0 && delta > remaining) return;
        if (delta < 0 && Math.abs(delta) > paid) return;
        const stamp = nowIso();
        const absolute = Math.round(Math.abs(delta) * 100) / 100;
        const isFullSettle = delta > 0 && Math.abs(remaining - absolute) < 0.001;
        const notes = delta < 0 ? "Storno" : isFullSettle ? "Estinzione" : "Versamento";
        insertLedger(userId, {
          id: createId(),
          title: `${currentItem.title} · ${notes}`,
          direction: currentItem.direction,
          person: currentItem.person,
          personId: currentItem.personId,
          amount: delta > 0 ? absolute : -absolute,
          paid: 0,
          notes,
          settled: true,
          relatedLedgerId: currentItem.id,
          createdAt: stamp,
          updatedAt: stamp,
        });
        if (delta < 0 && remaining <= 0 && currentItem.personId) {
          insertLifecycleEvent(userId, {
            personId: currentItem.personId,
            kind: "apertura",
            direction: currentItem.direction,
            amount: absolute,
            ledgerId: currentItem.id,
            notes: "Riapertura da storno",
            at: stamp,
          });
        }
      });
    },
    [commitUser]
  );

  const adjustLedgerTarget: StoreContextValue["adjustLedgerTarget"] = useCallback(
    (id, delta) => {
      commitUser((userId, data) => {
        const currentItem = data.ledger.find((item) => item.id === id);
        if (!currentItem || isLedgerPayment(currentItem) || delta === 0) return;
        const wasClosed = ledgerIsClosed(currentItem, data.ledger);
        const paid = ledgerPaid(currentItem, data.ledger);
        const amount = Math.max(paid, Math.round((currentItem.amount + delta) * 100) / 100);
        const stamp = nowIso();
        updateLedgerRow(
          userId,
          id,
          {
            ...currentItem,
            amount,
            settled: false,
            updatedAt: stamp,
          },
          currentItem
        );
        if (wasClosed && delta > 0 && currentItem.personId) {
          insertLifecycleEvent(userId, {
            personId: currentItem.personId,
            kind: "apertura",
            direction: currentItem.direction,
            amount: Math.abs(delta),
            ledgerId: currentItem.id,
            notes: "Riapertura con aumento",
            at: stamp,
          });
        }
      });
    },
    [commitUser]
  );

  const extinguishLedger: StoreContextValue["extinguishLedger"] = useCallback(
    (id) => {
      commitUser((userId, data) => {
        const currentItem = data.ledger.find((item) => item.id === id);
        if (!currentItem || isLedgerPayment(currentItem)) return;
        extinguishLedgerInDb(userId, currentItem, data.ledger);
      });
    },
    [commitUser]
  );

  const reopenLedger: StoreContextValue["reopenLedger"] = useCallback(
    (id) => {
      commitUser((userId, data) => {
        const currentItem = data.ledger.find((item) => item.id === id);
        if (!currentItem || isLedgerPayment(currentItem)) return;
        reopenLedgerInDb(userId, currentItem);
      });
    },
    [commitUser]
  );

  const addExpense: StoreContextValue["addExpense"] = useCallback(
    (entry) => {
      const stamp = nowIso();
      const { person, ...rest } = entry;
      const created: Expense = {
        ...rest,
        completed: entry.completed ?? false,
        id: createId(),
        createdAt: stamp,
        updatedAt: stamp,
      };
      commitUser((userId) => insertExpense(userId, created, person));
      return created;
    },
    [commitUser]
  );

  const updateExpense: StoreContextValue["updateExpense"] = useCallback(
    (id, patch) => {
      commitUser((userId, data) => {
        const currentItem = data.expenses.find((item) => item.id === id);
        if (!currentItem) return;
        const { person, ...rest } = patch;
        const next: Expense = { ...currentItem, ...rest, updatedAt: nowIso() };
        updateExpenseRow(userId, id, next, person === null ? "" : person);
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

  const renamePerson: StoreContextValue["renamePerson"] = useCallback(
    (id, name) => {
      commitUser((userId) => {
        renamePersonRow(userId, id, name);
      });
    },
    [commitUser]
  );

  const totals = useMemo(() => {
    const principals = current.data.ledger.filter((item) => !isLedgerPayment(item));
    const openDebts = principals
      .filter((item) => item.direction === "debito" && !ledgerIsClosed(item, current.data.ledger))
      .reduce((sum, item) => sum + ledgerRemaining(item, current.data.ledger), 0);
    const openCredits = principals
      .filter((item) => item.direction === "credito" && !ledgerIsClosed(item, current.data.ledger))
      .reduce((sum, item) => sum + ledgerRemaining(item, current.data.ledger), 0);
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
    loginWithPin,
    logout,
    isPinLoginAvailable,
    enablePin,
    disablePin,
    linkEmail,
    unlinkEmail,
    requestPasswordRecovery,
    finishPasswordRecovery,
    exportDatabase,
    importDatabase,
    resetStorage,
    addLedger,
    updateLedger,
    deleteLedger,
    adjustLedgerPaid,
    adjustLedgerTarget,
    extinguishLedger,
    reopenLedger,
    isLedgerTitleAvailable,
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
    renamePerson,
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

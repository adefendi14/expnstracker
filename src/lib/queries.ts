import type {
  AmountKind,
  AppData,
  DebtDirection,
  Expense,
  ExpenseCategory,
  InvestmentIdea,
  LedgerEntry,
  PersonEvent,
  PersonEventKind,
  PersonProfile,
  PiggyBank,
  Priority,
  Risk,
  UserAccount,
} from "@/lib/types";
import { ledgerPaid, ledgerTitleKey, normalizeLedgerTitle } from "@/lib/format";
import { normalizePersonKey, normalizePersonName } from "@/lib/people";
import {
  queryDirectoryOneSql,
  queryDirectorySql,
  queryOneSql,
  querySql,
  runDirectorySql,
  runSql,
} from "@/lib/sqlite";
import { newUuid } from "@/lib/uuid";

type UserRow = {
  id: string;
  name: string;
  username: string;
  password_salt: string;
  password_hash: string;
  created_at: string;
  email?: string | null;
  pin_enabled?: number | null;
  pin_salt?: string | null;
  pin_hash?: string | null;
  recovery_secret_blob?: string | null;
  recovery_kek_salt?: string | null;
};

type LedgerRow = {
  id: string;
  title?: string | null;
  direction: DebtDirection;
  person: string;
  person_id: string | null;
  amount: number;
  paid: number | null;
  due_date: string | null;
  notes: string | null;
  settled: number;
  related_ledger_id?: string | null;
  associated_ledger_id?: string | null;
  created_at: string;
  updated_at: string;
};

type ExpenseRow = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes: string | null;
  person_id: string | null;
  completed?: number | null;
  created_at: string;
  updated_at: string;
};

type IdeaRow = {
  id: string;
  title: string;
  amount: number;
  amount_kind: AmountKind;
  priority: Priority;
  risk: Risk;
  notes: string | null;
  link: string | null;
  completed: number;
  created_at: string;
  updated_at: string;
};

type PiggyRow = {
  id: string;
  name: string;
  target: number;
  current: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PersonRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  person_id: string;
  kind: PersonEventKind;
  direction: DebtDirection | null;
  amount: number;
  ledger_id: string | null;
  expense_id: string | null;
  notes: string | null;
  occurred_at: string;
  created_at: string;
};

function newId() {
  return newUuid();
}

function asPerson(row: PersonRow): PersonProfile {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asEvent(row: EventRow): PersonEvent {
  return {
    id: row.id,
    personId: row.person_id,
    kind: row.kind,
    direction: row.direction ?? undefined,
    amount: Number(row.amount),
    ledgerId: row.ledger_id ?? undefined,
    expenseId: row.expense_id ?? undefined,
    notes: row.notes ?? undefined,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

export function ensurePerson(userId: string, rawName: string): PersonProfile {
  const name = normalizePersonName(rawName);
  const key = normalizePersonKey(name);
  if (!key) {
    throw new Error("Indica chi è coinvolto.");
  }
  const existing = queryOneSql<PersonRow>(
    "SELECT id, name, created_at, updated_at FROM people WHERE user_id = ? AND name_key = ?",
    [userId, key]
  );
  if (existing) return asPerson(existing);
  const stamp = new Date().toISOString();
  const person: PersonProfile = { id: newId(), name, createdAt: stamp, updatedAt: stamp };
  runSql(
    "INSERT INTO people (id, user_id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [person.id, userId, person.name, key, person.createdAt, person.updatedAt]
  );
  return person;
}

export function renamePerson(userId: string, personId: string, rawName: string): PersonProfile {
  const name = normalizePersonName(rawName);
  const key = normalizePersonKey(name);
  if (!key) {
    throw new Error("Inserisci un nome.");
  }
  const current = queryOneSql<PersonRow>(
    "SELECT id, name, created_at, updated_at FROM people WHERE user_id = ? AND id = ?",
    [userId, personId]
  );
  if (!current) {
    throw new Error("Persona non trovata.");
  }
  const conflict = queryOneSql<PersonRow>(
    "SELECT id, name, created_at, updated_at FROM people WHERE user_id = ? AND name_key = ? AND id != ?",
    [userId, key, personId]
  );
  if (conflict) {
    throw new Error("Esiste già una persona con questo nome.");
  }
  const stamp = new Date().toISOString();
  runSql(
    "UPDATE people SET name = ?, name_key = ?, updated_at = ? WHERE user_id = ? AND id = ?",
    [name, key, stamp, userId, personId]
  );
  runSql("UPDATE ledger SET person = ? WHERE user_id = ? AND person_id = ?", [name, userId, personId]);
  return { id: personId, name, createdAt: current.created_at, updatedAt: stamp };
}

function insertPersonEvent(userId: string, event: Omit<PersonEvent, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
  const stamp = event.createdAt ?? new Date().toISOString();
  runSql(
    `INSERT INTO person_events
      (id, user_id, person_id, kind, direction, amount, ledger_id, expense_id, notes, occurred_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id ?? newId(),
      userId,
      event.personId,
      event.kind,
      event.direction ?? null,
      event.amount,
      event.ledgerId ?? null,
      event.expenseId ?? null,
      event.notes ?? null,
      event.occurredAt,
      stamp,
    ]
  );
}

export function insertLifecycleEvent(
  userId: string,
  event: {
    personId: string;
    kind: Extract<PersonEventKind, "apertura" | "chiusura" | "estinzione">;
    direction: DebtDirection;
    amount: number;
    ledgerId: string;
    notes?: string;
    at: string;
  }
) {
  insertPersonEvent(userId, {
    personId: event.personId,
    kind: event.kind,
    direction: event.direction,
    amount: event.amount,
    ledgerId: event.ledgerId,
    notes: event.notes,
    occurredAt: event.at,
    createdAt: event.at,
  });
}

function asAccount(row: UserRow): UserAccount {
  const email = row.email?.trim() || undefined;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email,
    pinEnabled: Number(row.pin_enabled ?? 0) === 1,
    recoveryEnabled: Boolean(email && row.recovery_secret_blob && row.recovery_kek_salt),
    createdAt: row.created_at,
  };
}

export function countUsers() {
  const row = queryDirectoryOneSql<{ total: number }>("SELECT COUNT(*) AS total FROM users");
  return Number(row?.total ?? 0);
}

export function listUsers() {
  return queryDirectorySql<UserRow>("SELECT * FROM users ORDER BY created_at ASC").map(asAccount);
}

export function findUserById(id: string) {
  const row = queryDirectoryOneSql<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
  return row ? asAccount(row) : undefined;
}

export function findUserAuth(username: string) {
  return queryDirectoryOneSql<UserRow>(
    "SELECT * FROM users WHERE username = ? COLLATE NOCASE",
    [username]
  );
}

export function findUserByEmail(email: string) {
  return queryDirectoryOneSql<UserRow>(
    "SELECT * FROM users WHERE email = ? COLLATE NOCASE",
    [email]
  );
}

export function isPinEnabledForUsername(username: string) {
  const row = findUserAuth(username);
  return Boolean(row && Number(row.pin_enabled ?? 0) === 1);
}

export function insertUser(user: {
  id: string;
  name: string;
  username: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}) {
  runDirectorySql(
    "INSERT INTO users (id, name, username, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [user.id, user.name, user.username, user.passwordSalt, user.passwordHash, user.createdAt]
  );
}

export function loadUserData(userId: string): AppData {
  const ledger = querySql<LedgerRow>(
    "SELECT * FROM ledger WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  ).map(
    (row): LedgerEntry => ({
      id: row.id,
      title:
        (row.title && String(row.title).trim()) ||
        `${row.person} · ${row.direction === "credito" ? "Credito" : "Debito"}`,
      direction: row.direction,
      person: row.person,
      personId: row.person_id ?? undefined,
      amount: Number(row.amount),
      paid: Number(row.paid ?? 0),
      dueDate: row.due_date ?? undefined,
      notes: row.notes ?? undefined,
      settled: Boolean(row.settled),
      relatedLedgerId: row.related_ledger_id ?? undefined,
      associatedLedgerId: row.associated_ledger_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  );
  const expenses = querySql<ExpenseRow>(
    "SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC",
    [userId]
  ).map(
    (row): Expense => ({
      id: row.id,
      amount: Number(row.amount),
      category: row.category,
      date: row.date,
      notes: row.notes ?? undefined,
      personId: row.person_id ?? undefined,
      completed: Boolean(row.completed),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  );
  const ideas = querySql<IdeaRow>(
    "SELECT * FROM ideas WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  ).map(
    (row): InvestmentIdea => ({
      id: row.id,
      title: row.title,
      amount: Number(row.amount),
      amountKind: row.amount_kind,
      priority: row.priority,
      risk: row.risk,
      notes: row.notes ?? undefined,
      link: row.link ?? undefined,
      completed: Boolean(row.completed),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  );
  const piggyBanks = querySql<PiggyRow>(
    "SELECT * FROM piggy_banks WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  ).map(
    (row): PiggyBank => ({
      id: row.id,
      name: row.name,
      target: Number(row.target),
      current: Number(row.current),
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  );
  const people = querySql<PersonRow>(
    "SELECT id, name, created_at, updated_at FROM people WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC",
    [userId]
  ).map(asPerson);
  const events = querySql<EventRow>(
    "SELECT id, person_id, kind, direction, amount, ledger_id, expense_id, notes, occurred_at, created_at FROM person_events WHERE user_id = ? ORDER BY occurred_at DESC",
    [userId]
  ).map(asEvent);
  return { version: 1, ledger, expenses, ideas, piggyBanks, people, events };
}

export function insertLegacyData(userId: string, data: AppData) {
  for (const item of data.ledger) {
    insertLedger(userId, item);
  }
  for (const item of data.expenses) {
    insertExpense(userId, item);
  }
  for (const item of data.ideas) {
    insertIdea(userId, item);
  }
  for (const item of data.piggyBanks) {
    insertPiggy(userId, item);
  }
}

export function isLedgerTitleTaken(userId: string, title: string, exceptId?: string) {
  const key = ledgerTitleKey(title);
  if (!key) return false;
  const rows = querySql<{ id: string; title: string }>(
    "SELECT id, title FROM ledger WHERE user_id = ? AND related_ledger_id IS NULL",
    [userId]
  );
  return rows.some(
    (row) => row.id !== exceptId && ledgerTitleKey(row.title || "") === key
  );
}

export function insertLedger(userId: string, item: LedgerEntry) {
  const person = ensurePerson(userId, item.person);
  const title = normalizeLedgerTitle(item.title) || `${person.name} · ${item.direction === "credito" ? "Credito" : "Debito"}`;
  runSql(
    `INSERT INTO ledger (id, user_id, title, direction, person, person_id, amount, paid, due_date, notes, settled, related_ledger_id, associated_ledger_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      userId,
      title,
      item.direction,
      person.name,
      person.id,
      item.amount,
      item.paid ?? 0,
      item.dueDate ?? null,
      item.notes ?? null,
      item.settled ? 1 : 0,
      item.relatedLedgerId ?? null,
      item.associatedLedgerId ?? null,
      item.createdAt,
      item.updatedAt,
    ]
  );

  if (item.relatedLedgerId) {
    const kind =
      item.notes === "Estinzione"
        ? "estinzione"
        : item.amount < 0
          ? "storno"
          : "versamento";
    insertPersonEvent(userId, {
      personId: person.id,
      kind,
      direction: item.direction,
      amount: Math.abs(item.amount),
      ledgerId: item.id,
      notes: item.notes,
      occurredAt: item.createdAt,
      createdAt: item.createdAt,
    });
    if (kind === "estinzione") {
      insertPersonEvent(userId, {
        personId: person.id,
        kind: "chiusura",
        direction: item.direction,
        amount: Math.abs(item.amount),
        ledgerId: item.relatedLedgerId,
        notes: "Chiusura",
        occurredAt: item.createdAt,
        createdAt: item.createdAt,
      });
    }
    return;
  }

  insertPersonEvent(userId, {
    personId: person.id,
    kind: item.direction,
    direction: item.direction,
    amount: item.amount,
    ledgerId: item.id,
    notes: item.notes,
    occurredAt: item.createdAt,
    createdAt: item.createdAt,
  });
  const paid = item.paid ?? 0;
  if (paid > 0) {
    insertPersonEvent(userId, {
      personId: person.id,
      kind: "versamento",
      direction: item.direction,
      amount: paid,
      ledgerId: item.id,
      occurredAt: item.createdAt,
      createdAt: item.createdAt,
    });
  }
}

export function updateLedgerRow(userId: string, id: string, item: LedgerEntry, previous?: LedgerEntry) {
  const person = ensurePerson(userId, item.person);
  const title = normalizeLedgerTitle(item.title) || `${person.name} · ${item.direction === "credito" ? "Credito" : "Debito"}`;
  runSql(
    `UPDATE ledger SET title = ?, direction = ?, person = ?, person_id = ?, amount = ?, paid = ?, due_date = ?, notes = ?, settled = ?, related_ledger_id = ?, associated_ledger_id = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [
      title,
      item.direction,
      person.name,
      person.id,
      item.amount,
      item.paid ?? 0,
      item.dueDate ?? null,
      item.notes ?? null,
      item.settled ? 1 : 0,
      item.relatedLedgerId ?? null,
      item.associatedLedgerId ?? null,
      item.updatedAt,
      id,
      userId,
    ]
  );
  if (previous?.personId && previous.personId !== person.id) {
    runSql("UPDATE person_events SET person_id = ? WHERE ledger_id = ? AND user_id = ?", [
      person.id,
      id,
      userId,
    ]);
  }
  if (!previous) return;
  const paidDelta = roundEuro(ledgerPaid(item) - ledgerPaid(previous));
  const targetDelta = roundEuro(item.amount - previous.amount);
  if (targetDelta > 0) {
    insertPersonEvent(userId, {
      personId: person.id,
      kind: "obiettivo",
      direction: item.direction,
      amount: targetDelta,
      ledgerId: id,
      occurredAt: item.updatedAt,
      createdAt: item.updatedAt,
    });
  }
  if (paidDelta > 0) {
    insertPersonEvent(userId, {
      personId: person.id,
      kind: "versamento",
      direction: item.direction,
      amount: paidDelta,
      ledgerId: id,
      occurredAt: item.updatedAt,
      createdAt: item.updatedAt,
    });
  } else if (paidDelta < 0) {
    insertPersonEvent(userId, {
      personId: person.id,
      kind: "storno",
      direction: item.direction,
      amount: Math.abs(paidDelta),
      ledgerId: id,
      occurredAt: item.updatedAt,
      createdAt: item.updatedAt,
    });
  }
}

export function deleteLedgerRow(userId: string, id: string) {
  const children = querySql<{ id: string }>(
    "SELECT id FROM ledger WHERE related_ledger_id = ? AND user_id = ?",
    [id, userId]
  );
  for (const child of children) {
    runSql("DELETE FROM person_events WHERE ledger_id = ? AND user_id = ?", [child.id, userId]);
    runSql("DELETE FROM ledger WHERE id = ? AND user_id = ?", [child.id, userId]);
  }
  runSql("DELETE FROM person_events WHERE ledger_id = ? AND user_id = ?", [id, userId]);
  runSql("DELETE FROM ledger WHERE id = ? AND user_id = ?", [id, userId]);
}

export function deleteRelatedLedgerRows(userId: string, parentId: string) {
  const children = querySql<{ id: string }>(
    "SELECT id FROM ledger WHERE related_ledger_id = ? AND user_id = ?",
    [parentId, userId]
  );
  for (const child of children) {
    runSql("DELETE FROM person_events WHERE ledger_id = ? AND user_id = ?", [child.id, userId]);
    runSql("DELETE FROM ledger WHERE id = ? AND user_id = ?", [child.id, userId]);
  }
}

export function insertExpense(userId: string, item: Expense, personName?: string) {
  const person = personName?.trim() ? ensurePerson(userId, personName) : undefined;
  const personId = person?.id ?? item.personId ?? null;
  runSql(
    `INSERT INTO expenses (id, user_id, amount, category, date, notes, person_id, completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      userId,
      item.amount,
      item.category,
      item.date,
      item.notes ?? null,
      personId,
      item.completed ? 1 : 0,
      item.createdAt,
      item.updatedAt,
    ]
  );
  if (personId) {
    insertPersonEvent(userId, {
      personId,
      kind: "spesa",
      amount: item.amount,
      expenseId: item.id,
      notes: item.notes,
      occurredAt: item.date,
      createdAt: item.createdAt,
    });
  }
}

export function updateExpenseRow(userId: string, id: string, item: Expense, personName?: string) {
  const person = personName?.trim() ? ensurePerson(userId, personName) : undefined;
  const personId = personName !== undefined ? (person?.id ?? null) : (item.personId ?? null);
  runSql(
    `UPDATE expenses SET amount = ?, category = ?, date = ?, notes = ?, person_id = ?, completed = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [
      item.amount,
      item.category,
      item.date,
      item.notes ?? null,
      personId,
      item.completed ? 1 : 0,
      item.updatedAt,
      id,
      userId,
    ]
  );
  runSql("DELETE FROM person_events WHERE expense_id = ? AND user_id = ?", [id, userId]);
  if (personId) {
    insertPersonEvent(userId, {
      personId,
      kind: "spesa",
      amount: item.amount,
      expenseId: id,
      notes: item.notes,
      occurredAt: item.date,
      createdAt: item.updatedAt,
    });
  }
}

export function deleteExpenseRow(userId: string, id: string) {
  runSql("DELETE FROM person_events WHERE expense_id = ? AND user_id = ?", [id, userId]);
  runSql("DELETE FROM expenses WHERE id = ? AND user_id = ?", [id, userId]);
}

function roundEuro(value: number) {
  return Math.round(value * 100) / 100;
}

export function insertIdea(userId: string, item: InvestmentIdea) {
  runSql(
    `INSERT INTO ideas (id, user_id, title, amount, amount_kind, priority, risk, notes, link, completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      userId,
      item.title,
      item.amount,
      item.amountKind,
      item.priority,
      item.risk,
      item.notes ?? null,
      item.link ?? null,
      item.completed ? 1 : 0,
      item.createdAt,
      item.updatedAt,
    ]
  );
}

export function updateIdeaRow(userId: string, id: string, item: InvestmentIdea) {
  runSql(
    `UPDATE ideas SET title = ?, amount = ?, amount_kind = ?, priority = ?, risk = ?, notes = ?, link = ?, completed = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [
      item.title,
      item.amount,
      item.amountKind,
      item.priority,
      item.risk,
      item.notes ?? null,
      item.link ?? null,
      item.completed ? 1 : 0,
      item.updatedAt,
      id,
      userId,
    ]
  );
}

export function deleteIdeaRow(userId: string, id: string) {
  runSql("DELETE FROM ideas WHERE id = ? AND user_id = ?", [id, userId]);
}

export function insertPiggy(userId: string, item: PiggyBank) {
  runSql(
    `INSERT INTO piggy_banks (id, user_id, name, target, current, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, userId, item.name, item.target, item.current, item.notes ?? null, item.createdAt, item.updatedAt]
  );
}

export function updatePiggyRow(userId: string, id: string, item: PiggyBank) {
  runSql(
    `UPDATE piggy_banks SET name = ?, target = ?, current = ?, notes = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [item.name, item.target, item.current, item.notes ?? null, item.updatedAt, id, userId]
  );
}

export function deletePiggyRow(userId: string, id: string) {
  runSql("DELETE FROM piggy_banks WHERE id = ? AND user_id = ?", [id, userId]);
}

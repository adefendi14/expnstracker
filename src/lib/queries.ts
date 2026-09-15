import type {
  AmountKind,
  AppData,
  DebtDirection,
  Expense,
  ExpenseCategory,
  InvestmentIdea,
  LedgerEntry,
  PiggyBank,
  Priority,
  Risk,
  UserAccount,
} from "@/lib/types";
import { queryOneSql, querySql, runSql } from "@/lib/sqlite";

type UserRow = {
  id: string;
  name: string;
  username: string;
  password_salt: string;
  password_hash: string;
  created_at: string;
};

type LedgerRow = {
  id: string;
  direction: DebtDirection;
  person: string;
  amount: number;
  due_date: string | null;
  notes: string | null;
  settled: number;
  created_at: string;
  updated_at: string;
};

type ExpenseRow = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes: string | null;
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

function asAccount(row: UserRow): UserAccount {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    createdAt: row.created_at,
  };
}

export function countUsers() {
  const row = queryOneSql<{ total: number }>("SELECT COUNT(*) AS total FROM users");
  return Number(row?.total ?? 0);
}

export function listUsers() {
  return querySql<UserRow>("SELECT * FROM users ORDER BY created_at ASC").map(asAccount);
}

export function findUserById(id: string) {
  const row = queryOneSql<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
  return row ? asAccount(row) : undefined;
}

export function findUserAuth(username: string) {
  return queryOneSql<UserRow>("SELECT * FROM users WHERE username = ? COLLATE NOCASE", [username]);
}

export function insertUser(user: {
  id: string;
  name: string;
  username: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}) {
  runSql(
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
      direction: row.direction,
      person: row.person,
      amount: Number(row.amount),
      dueDate: row.due_date ?? undefined,
      notes: row.notes ?? undefined,
      settled: Boolean(row.settled),
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
  return { version: 1, ledger, expenses, ideas, piggyBanks };
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

export function insertLedger(userId: string, item: LedgerEntry) {
  runSql(
    `INSERT INTO ledger (id, user_id, direction, person, amount, due_date, notes, settled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      userId,
      item.direction,
      item.person,
      item.amount,
      item.dueDate ?? null,
      item.notes ?? null,
      item.settled ? 1 : 0,
      item.createdAt,
      item.updatedAt,
    ]
  );
}

export function updateLedgerRow(userId: string, id: string, item: LedgerEntry) {
  runSql(
    `UPDATE ledger SET direction = ?, person = ?, amount = ?, due_date = ?, notes = ?, settled = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [
      item.direction,
      item.person,
      item.amount,
      item.dueDate ?? null,
      item.notes ?? null,
      item.settled ? 1 : 0,
      item.updatedAt,
      id,
      userId,
    ]
  );
}

export function deleteLedgerRow(userId: string, id: string) {
  runSql("DELETE FROM ledger WHERE id = ? AND user_id = ?", [id, userId]);
}

export function insertExpense(userId: string, item: Expense) {
  runSql(
    `INSERT INTO expenses (id, user_id, amount, category, date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, userId, item.amount, item.category, item.date, item.notes ?? null, item.createdAt, item.updatedAt]
  );
}

export function updateExpenseRow(userId: string, id: string, item: Expense) {
  runSql(
    `UPDATE expenses SET amount = ?, category = ?, date = ?, notes = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [item.amount, item.category, item.date, item.notes ?? null, item.updatedAt, id, userId]
  );
}

export function deleteExpenseRow(userId: string, id: string) {
  runSql("DELETE FROM expenses WHERE id = ? AND user_id = ?", [id, userId]);
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

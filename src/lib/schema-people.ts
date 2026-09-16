import type { Database } from "sql.js";
import { normalizePersonKey, normalizePersonName } from "@/lib/people";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function columnNames(db: Database, table: string) {
  const info = db.exec(`PRAGMA table_info(${table})`);
  return new Set((info[0]?.values ?? []).map((row) => String(row[1])));
}

function addColumnIfMissing(db: Database, table: string, column: string, spec: string) {
  if (!columnNames(db, table).has(column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${spec}`);
  }
}

function schemaVersion(db: Database) {
  const info = db.exec("SELECT value FROM meta WHERE key = 'schema_version'");
  return Number(info[0]?.values?.[0]?.[0] ?? 1);
}

export function applyPeopleSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, name_key)
    );
    CREATE TABLE IF NOT EXISTS person_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      direction TEXT,
      amount REAL NOT NULL,
      ledger_id TEXT,
      expense_id TEXT,
      notes TEXT,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );
  `);
  addColumnIfMissing(db, "ledger", "person_id", "TEXT");
  addColumnIfMissing(db, "expenses", "person_id", "TEXT");

  if (schemaVersion(db) >= 2) return;

  backfillPeople(db);
  backfillEvents(db);
  db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2')");
}

function backfillPeople(db: Database) {
  const existing = new Map<string, string>();
  const peopleStmt = db.prepare("SELECT id, user_id, name_key FROM people");
  while (peopleStmt.step()) {
    const [id, userId, nameKey] = peopleStmt.get();
    existing.set(`${String(userId)}\0${String(nameKey)}`, String(id));
  }
  peopleStmt.free();

  const ledgerStmt = db.prepare("SELECT id, user_id, person FROM ledger");
  const ledgerRows: Array<{ id: string; userId: string; person: string }> = [];
  while (ledgerStmt.step()) {
    const [id, userId, person] = ledgerStmt.get();
    ledgerRows.push({ id: String(id), userId: String(userId), person: String(person ?? "") });
  }
  ledgerStmt.free();

  const stamp = new Date().toISOString();
  for (const row of ledgerRows) {
    const name = normalizePersonName(row.person);
    if (!name) continue;
    const key = normalizePersonKey(name);
    const mapKey = `${row.userId}\0${key}`;
    let personId = existing.get(mapKey);
    if (!personId) {
      personId = newId();
      db.run(
        "INSERT INTO people (id, user_id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [personId, row.userId, name, key, stamp, stamp]
      );
      existing.set(mapKey, personId);
    }
    db.run("UPDATE ledger SET person_id = ?, person = ? WHERE id = ?", [personId, name, row.id]);
  }
}

function backfillEvents(db: Database) {
  const countInfo = db.exec("SELECT COUNT(*) FROM person_events");
  if (Number(countInfo[0]?.values?.[0]?.[0] ?? 0) > 0) return;

  const stmt = db.prepare(
    "SELECT id, user_id, person_id, direction, amount, paid, notes, created_at, updated_at FROM ledger WHERE person_id IS NOT NULL"
  );
  while (stmt.step()) {
    const [id, userId, personId, direction, amount, paid, notes, createdAt, updatedAt] = stmt.get();
    if (!personId) continue;
    const stamp = String(createdAt);
    db.run(
      `INSERT INTO person_events
        (id, user_id, person_id, kind, direction, amount, ledger_id, expense_id, notes, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      [
        newId(),
        String(userId),
        String(personId),
        String(direction),
        String(direction),
        Number(amount),
        String(id),
        notes == null ? null : String(notes),
        stamp,
        stamp,
      ]
    );
    const paidAmount = Number(paid ?? 0);
    if (paidAmount > 0) {
      const paidAt = String(updatedAt || createdAt);
      db.run(
        `INSERT INTO person_events
          (id, user_id, person_id, kind, direction, amount, ledger_id, expense_id, notes, occurred_at, created_at)
         VALUES (?, ?, ?, 'versamento', ?, ?, ?, NULL, NULL, ?, ?)`,
        [newId(), String(userId), String(personId), String(direction), paidAmount, String(id), paidAt, paidAt]
      );
    }
  }
  stmt.free();
}

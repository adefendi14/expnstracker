/**
 * Builds a fresh ExpnsTracker SQLite DB with one test account and sample data.
 * Usage: node scripts/seed-test-account.mjs [outPath]
 */
import { createHash, randomBytes, webcrypto } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(process.argv[2] ?? `${__dirname}/../public/seed/expnstracker-test.sqlite`);

const USER = {
  id: "user-test-andrea",
  name: "Andrea Test",
  username: "test@example.com",
  password: "test1234",
};

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, saltBytes = randomBytes(16)) {
  const material = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 120_000 },
    material,
    256
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(saltBytes) };
}

function id(label) {
  return createHash("sha1").update(label).digest("hex").slice(0, 32);
}

function personKey(name) {
  return name.trim().toLocaleLowerCase("it-IT").replace(/\s+/g, " ");
}

function applySchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      direction TEXT NOT NULL,
      person TEXT NOT NULL,
      person_id TEXT,
      amount REAL NOT NULL,
      paid REAL NOT NULL DEFAULT 0,
      due_date TEXT,
      notes TEXT,
      settled INTEGER NOT NULL DEFAULT 0,
      related_ledger_id TEXT,
      associated_ledger_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      person_id TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      amount_kind TEXT NOT NULL,
      priority TEXT NOT NULL,
      risk TEXT NOT NULL,
      notes TEXT,
      link TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS piggy_banks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target REAL NOT NULL,
      current REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
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
  db.run("PRAGMA foreign_keys = ON;");
  db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2');");
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  applySchema(db);

  const secret = await hashPassword(USER.password);
  const now = new Date();
  const iso = (daysAgo = 0, hour = 12) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 15, 0, 0);
    return d.toISOString();
  };
  const day = (daysAgo = 0) => iso(daysAgo).slice(0, 10);

  const uid = USER.id;
  db.run(
    "INSERT INTO users (id, name, username, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [uid, USER.name, USER.username, secret.salt, secret.hash, iso(30)]
  );

  const people = [
    { id: id("person-marco"), name: "Marco Rossi" },
    { id: id("person-giulia"), name: "Giulia Bianchi" },
    { id: id("person-luca"), name: "Luca Verdi" },
    { id: id("person-sara"), name: "Sara Neri" },
  ];
  for (const person of people) {
    db.run(
      "INSERT INTO people (id, user_id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [person.id, uid, person.name, personKey(person.name), iso(28), iso(2)]
    );
  }

  const [marco, giulia, luca, sara] = people;

  const ledger = [
    {
      id: id("led-1"),
      title: "Cena di gruppo",
      direction: "credito",
      person: marco.name,
      personId: marco.id,
      amount: 120,
      paid: 40,
      dueDate: day(-7),
      notes: "Cena di gruppo",
      settled: 0,
      createdAt: iso(20),
    },
    {
      id: id("led-2"),
      title: "Biglietti treno",
      direction: "debito",
      person: giulia.name,
      personId: giulia.id,
      amount: 85.5,
      paid: 0,
      dueDate: day(-3),
      notes: "Biglietti treno",
      settled: 0,
      createdAt: iso(14),
    },
    {
      id: id("led-3"),
      title: "Prestito weekend",
      direction: "credito",
      person: luca.name,
      personId: luca.id,
      amount: 200,
      paid: 200,
      dueDate: day(10),
      notes: "Prestito weekend",
      settled: 1,
      createdAt: iso(40),
    },
    {
      id: id("led-4"),
      title: "Spesa condivisa",
      direction: "debito",
      person: sara.name,
      personId: sara.id,
      amount: 45,
      paid: 15,
      dueDate: day(-1),
      notes: "Spesa condivisa",
      settled: 0,
      createdAt: iso(8),
    },
  ];

  for (const item of ledger) {
    db.run(
      `INSERT INTO ledger
        (id, user_id, title, direction, person, person_id, amount, paid, due_date, notes, settled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        uid,
        item.title,
        item.direction,
        item.person,
        item.personId,
        item.amount,
        item.paid,
        item.dueDate,
        item.notes,
        item.settled,
        item.createdAt,
        iso(1),
      ]
    );
    db.run(
      `INSERT INTO person_events
        (id, user_id, person_id, kind, direction, amount, ledger_id, expense_id, notes, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      [
        id(`ev-${item.id}`),
        uid,
        item.personId,
        item.direction,
        item.direction,
        item.amount,
        item.id,
        item.notes,
        item.createdAt,
        item.createdAt,
      ]
    );
  }

  const expenses = [
    { id: id("exp-1"), amount: 62.4, category: "cibo", date: day(2), notes: "Spesa Esselunga", personId: null },
    { id: id("exp-2"), amount: 18.9, category: "trasporti", date: day(4), notes: "Metro + bus", personId: null },
    { id: id("exp-3"), amount: 35, category: "uscite", date: day(6), notes: "Aperitivo con Marco", personId: marco.id },
    { id: id("exp-4"), amount: 120, category: "casa", date: day(12), notes: "Bolletta luce", personId: null },
    { id: id("exp-5"), amount: 49.9, category: "svago", date: day(9), notes: "Abbonamento streaming", personId: null },
  ];
  for (const item of expenses) {
    db.run(
      `INSERT INTO expenses
        (id, user_id, amount, category, date, notes, person_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, uid, item.amount, item.category, item.date, item.notes, item.personId, iso(Number(item.date.slice(-2)) || 3), iso(1)]
    );
    if (item.personId) {
      db.run(
        `INSERT INTO person_events
          (id, user_id, person_id, kind, direction, amount, ledger_id, expense_id, notes, occurred_at, created_at)
         VALUES (?, ?, ?, 'spesa', NULL, ?, NULL, ?, ?, ?, ?)`,
        [id(`ev-${item.id}`), uid, item.personId, item.amount, item.id, item.notes, `${item.date}T18:00:00.000Z`, iso(3)]
      );
    }
  }

  const ideas = [
    {
      id: id("idea-1"),
      title: "ETF globale",
      amount: 1500,
      amountKind: "stimato",
      priority: "alta",
      risk: "medio",
      notes: "PAC mensile",
      completed: 0,
    },
    {
      id: id("idea-2"),
      title: "Conto deposito",
      amount: 2000,
      amountKind: "attuale",
      priority: "media",
      risk: "basso",
      notes: "Parcheggio liquidità",
      completed: 0,
    },
  ];
  for (const item of ideas) {
    db.run(
      `INSERT INTO ideas
        (id, user_id, title, amount, amount_kind, priority, risk, notes, link, completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      [
        item.id,
        uid,
        item.title,
        item.amount,
        item.amountKind,
        item.priority,
        item.risk,
        item.notes,
        item.completed,
        iso(15),
        iso(2),
      ]
    );
  }

  const piggies = [
    { id: id("pig-1"), name: "Vacanze estate", target: 1200, current: 480, notes: "Sardegna" },
    { id: id("pig-2"), name: "Nuovo telefono", target: 900, current: 250, notes: null },
    { id: id("pig-3"), name: "Fondo emergenza", target: 3000, current: 1750, notes: "3 mesi di spese" },
  ];
  for (const item of piggies) {
    db.run(
      `INSERT INTO piggy_banks
        (id, user_id, name, target, current, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, uid, item.name, item.target, item.current, item.notes, iso(25), iso(1)]
    );
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(db.export()));
  db.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        path: outPath,
        username: USER.username,
        password: USER.password,
        name: USER.name,
        counts: {
          people: people.length,
          ledger: ledger.length,
          expenses: expenses.length,
          ideas: ideas.length,
          piggyBanks: piggies.length,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

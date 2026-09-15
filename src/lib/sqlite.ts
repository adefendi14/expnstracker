import type { Database, SqlJsStatic, SqlValue } from "sql.js";
import { withBase } from "@/lib/paths";

export const DB_FILE_NAME = "expnstracker.sqlite";
const IDB_NAME = "expnstracker";
const IDB_STORE = "files";
const IDB_KEY = DB_FILE_NAME;

let sqlRuntime: SqlJsStatic | null = null;
let database: Database | null = null;
let persistQueue: Promise<void> = Promise.resolve();

function openIdb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_STORE)) {
        request.result.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB non disponibile."));
  });
}

async function readStoredFile() {
  const idb = await openIdb();
  return new Promise<Uint8Array | null>((resolve, reject) => {
    const request = idb.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(IDB_KEY);
    request.onsuccess = () => {
      const value = request.result;
      if (!value) {
        resolve(null);
        return;
      }
      resolve(value instanceof Uint8Array ? value : new Uint8Array(value));
    };
    request.onerror = () => reject(request.error ?? new Error("Lettura del file SQLite non riuscita."));
  });
}

async function writeStoredFile(bytes: Uint8Array) {
  const idb = await openIdb();
  return new Promise<void>((resolve, reject) => {
    const request = idb.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(bytes, IDB_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Salvataggio del file SQLite non riuscito."));
  });
}

function applySchema(db: Database) {
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
      direction TEXT NOT NULL,
      person TEXT NOT NULL,
      amount REAL NOT NULL,
      paid REAL NOT NULL DEFAULT 0,
      due_date TEXT,
      notes TEXT,
      settled INTEGER NOT NULL DEFAULT 0,
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
  `);
  db.run("PRAGMA foreign_keys = ON;");
  db.run("INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '1');");
  const ledgerInfo = db.exec("PRAGMA table_info(ledger)");
  const ledgerColumns = new Set((ledgerInfo[0]?.values ?? []).map((row) => String(row[1])));
  if (!ledgerColumns.has("paid")) {
    db.run("ALTER TABLE ledger ADD COLUMN paid REAL NOT NULL DEFAULT 0");
  }
}

export function getDb() {
  if (!database) {
    throw new Error("Database non inizializzato.");
  }
  return database;
}

export async function openSqlite() {
  if (database) return database;
  const sqlModule = await import("sql.js");
  const initSqlJs = sqlModule.default;
  sqlRuntime = await initSqlJs({
    locateFile: (file) => (file.endsWith(".wasm") ? withBase("/sql-wasm.wasm") : withBase(`/${file}`)),
  });
  const stored = await readStoredFile();
  database = stored ? new sqlRuntime.Database(stored) : new sqlRuntime.Database();
  applySchema(database);
  await persistNow();
  return database;
}

export async function persistNow() {
  await writeStoredFile(getDb().export());
}

export function persist() {
  persistQueue = persistQueue.then(
    () => persistNow(),
    () => persistNow()
  );
  return persistQueue;
}

export function exportSqliteBytes() {
  return getDb().export();
}

export function isSqliteFile(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes.slice(0, 16)).startsWith("SQLite format 3");
}

export async function replaceSqlite(bytes: Uint8Array) {
  if (!sqlRuntime) {
    throw new Error("Database non inizializzato.");
  }
  if (!isSqliteFile(bytes)) {
    throw new Error("Il file non è un database SQLite valido.");
  }
  database?.close();
  database = new sqlRuntime.Database(bytes);
  applySchema(database);
  await persistNow();
}

export async function wipeSqlite() {
  if (!sqlRuntime) {
    throw new Error("Database non inizializzato.");
  }
  database?.close();
  database = new sqlRuntime.Database();
  applySchema(database);
  await persistNow();
}

export function runSql(sql: string, params: SqlValue[] = []) {
  getDb().run(sql, params);
}

export function querySql<T extends object>(sql: string, params: SqlValue[] = []) {
  const statement = getDb().prepare(sql);
  try {
    statement.bind(params);
    const rows: T[] = [];
    while (statement.step()) {
      rows.push(statement.getAsObject() as T);
    }
    return rows;
  } finally {
    statement.free();
  }
}

export function queryOneSql<T extends object>(sql: string, params: SqlValue[] = []) {
  return querySql<T>(sql, params)[0];
}

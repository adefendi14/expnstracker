import type { Database, SqlJsStatic, SqlValue } from "sql.js";
import { withBase } from "@/lib/paths";
import { applyPeopleSchema } from "@/lib/schema-people";
import {
  bytesToBase64,
  base64ToBytes,
  decryptBytes,
  deriveKek,
  encryptBytes,
  exportDekRaw,
  generateDek,
  importDekRaw,
  packEncryptedBlob,
  unpackEncryptedBlob,
  unwrapDek,
  wrapDek,
  type EncryptedBlob,
  type VaultKey,
} from "@/lib/vault-crypto";

export const DB_FILE_NAME = "expnstracker.sqlite";
const IDB_NAME = "expnstracker";
const IDB_STORE = "files";
const LEGACY_KEY = DB_FILE_NAME;
const DIRECTORY_KEY = "directory.sqlite";
const VAULT_KEY_PREFIX = "vault:";
const SESSION_DEK_KEY = "expnstracker.vaultDek";

let sqlRuntime: SqlJsStatic | null = null;
let directoryDb: Database | null = null;
let database: Database | null = null;
let activeUserId: string | null = null;
let vaultDek: VaultKey | null = null;
let persistQueue: Promise<void> = Promise.resolve();
let idbPromise: Promise<IDBDatabase> | null = null;

type InitSqlJs = (config?: {
  locateFile?: (file: string) => string;
}) => Promise<SqlJsStatic>;

let sqlJsPromise: Promise<{ default: InitSqlJs }> | null = null;

const WASM_PATH = () => withBase("/sql-wasm.wasm");

function loadSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = import("sql.js") as unknown as Promise<{ default: InitSqlJs }>;
  }
  return sqlJsPromise;
}

/** Warm the wasm + module cache as early as the client bundle runs. */
export function prefetchSqliteRuntime() {
  if (typeof window === "undefined") return;
  void loadSqlJs();
  void fetch(WASM_PATH(), { credentials: "same-origin", cache: "force-cache" }).catch(() => {});
}

function openIdb() {
  if (!idbPromise) {
    idbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(IDB_STORE)) {
          request.result.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        idbPromise = null;
        reject(request.error ?? new Error("IndexedDB non disponibile."));
      };
    });
  }
  return idbPromise;
}

async function idbGet(key: string) {
  const idb = await openIdb();
  return new Promise<unknown>((resolve, reject) => {
    const request = idb.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("Lettura IndexedDB non riuscita."));
  });
}

async function idbPut(key: string, value: unknown) {
  const idb = await openIdb();
  return new Promise<void>((resolve, reject) => {
    const request = idb.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Salvataggio IndexedDB non riuscito."));
  });
}

async function idbDelete(key: string) {
  const idb = await openIdb();
  return new Promise<void>((resolve, reject) => {
    const request = idb.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Cancellazione IndexedDB non riuscita."));
  });
}

function asBytes(value: unknown): Uint8Array | null {
  if (!value) return null;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return null;
}

function applyDirectorySchema(db: Database) {
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
      created_at TEXT NOT NULL,
      kek_salt TEXT,
      wrap_iv TEXT,
      wrapped_dek TEXT,
      email TEXT,
      pin_enabled INTEGER NOT NULL DEFAULT 0,
      pin_salt TEXT,
      pin_hash TEXT,
      pin_kek_salt TEXT,
      pin_wrap_iv TEXT,
      pin_wrapped_dek TEXT,
      recovery_kek_salt TEXT,
      recovery_wrap_iv TEXT,
      recovery_wrapped_dek TEXT,
      recovery_secret_blob TEXT
    );
  `);
  db.run("INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', 'dir-1');");
  const info = db.exec("PRAGMA table_info(users)");
  const columns = new Set((info[0]?.values ?? []).map((row) => String(row[1])));
  const ensure = (name: string, ddl: string) => {
    if (!columns.has(name)) db.run(ddl);
  };
  ensure("kek_salt", "ALTER TABLE users ADD COLUMN kek_salt TEXT");
  ensure("wrap_iv", "ALTER TABLE users ADD COLUMN wrap_iv TEXT");
  ensure("wrapped_dek", "ALTER TABLE users ADD COLUMN wrapped_dek TEXT");
  ensure("email", "ALTER TABLE users ADD COLUMN email TEXT");
  ensure("pin_enabled", "ALTER TABLE users ADD COLUMN pin_enabled INTEGER NOT NULL DEFAULT 0");
  ensure("pin_salt", "ALTER TABLE users ADD COLUMN pin_salt TEXT");
  ensure("pin_hash", "ALTER TABLE users ADD COLUMN pin_hash TEXT");
  ensure("pin_kek_salt", "ALTER TABLE users ADD COLUMN pin_kek_salt TEXT");
  ensure("pin_wrap_iv", "ALTER TABLE users ADD COLUMN pin_wrap_iv TEXT");
  ensure("pin_wrapped_dek", "ALTER TABLE users ADD COLUMN pin_wrapped_dek TEXT");
  ensure("recovery_kek_salt", "ALTER TABLE users ADD COLUMN recovery_kek_salt TEXT");
  ensure("recovery_wrap_iv", "ALTER TABLE users ADD COLUMN recovery_wrap_iv TEXT");
  ensure("recovery_wrapped_dek", "ALTER TABLE users ADD COLUMN recovery_wrapped_dek TEXT");
  ensure("recovery_secret_blob", "ALTER TABLE users ADD COLUMN recovery_secret_blob TEXT");
}

function applyVaultSchema(db: Database) {
  let dirty = false;
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
  `);
  db.run("PRAGMA foreign_keys = ON;");
  db.run("INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '1');");
  const ledgerInfo = db.exec("PRAGMA table_info(ledger)");
  const ledgerColumns = new Set((ledgerInfo[0]?.values ?? []).map((row) => String(row[1])));
  if (!ledgerColumns.has("paid")) {
    db.run("ALTER TABLE ledger ADD COLUMN paid REAL NOT NULL DEFAULT 0");
    dirty = true;
  }
  return applyPeopleSchema(db) || dirty;
}

async function ensureSqlRuntime() {
  if (sqlRuntime) return sqlRuntime;
  const wasmPath = WASM_PATH();
  const sqlModule = await loadSqlJs();
  sqlRuntime = await sqlModule.default({
    locateFile: (file) => (file.endsWith(".wasm") ? wasmPath : withBase(`/${file}`)),
  });
  return sqlRuntime;
}

function rememberSessionDek(dek: VaultKey) {
  void exportDekRaw(dek).then((raw) => {
    try {
      sessionStorage.setItem(SESSION_DEK_KEY, bytesToBase64(raw));
    } catch {
      // Private mode may block sessionStorage.
    }
  });
}

function clearSessionDek() {
  try {
    sessionStorage.removeItem(SESSION_DEK_KEY);
  } catch {
    // ignore
  }
}

async function readSessionDek() {
  try {
    const raw = sessionStorage.getItem(SESSION_DEK_KEY);
    if (!raw) return null;
    return importDekRaw(base64ToBytes(raw));
  } catch {
    return null;
  }
}

function selectObjects(source: Database, sql: string, params: SqlValue[] = []) {
  const statement = source.prepare(sql);
  try {
    statement.bind(params);
    const rows: Record<string, SqlValue>[] = [];
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }
    return rows;
  } finally {
    statement.free();
  }
}

function tableExists(source: Database, table: string) {
  const rows = selectObjects(
    source,
    "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    [table]
  );
  return rows.length > 0;
}

function copyUserRow(source: Database, target: Database, userId: string) {
  const rows = selectObjects(
    source,
    "SELECT id, name, username, password_salt, password_hash, created_at FROM users WHERE id = ?",
    [userId]
  );
  const values = rows[0];
  if (!values) return;
  target.run(
    "INSERT OR REPLACE INTO users (id, name, username, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      values.id,
      values.name,
      values.username,
      values.password_salt,
      values.password_hash,
      values.created_at,
    ]
  );
}

function copyUserData(source: Database, target: Database, userId: string) {
  copyUserRow(source, target, userId);
  const tables = [
    "ledger",
    "expenses",
    "ideas",
    "piggy_banks",
    "people",
    "person_events",
  ] as const;
  for (const table of tables) {
    if (!tableExists(source, table)) continue;
    const rows = selectObjects(source, `SELECT * FROM ${table} WHERE user_id = ?`, [userId]);
    if (rows.length === 0) continue;
    const cols = Object.keys(rows[0]!);
    const placeholders = cols.map(() => "?").join(", ");
    const insert = target.prepare(
      `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`
    );
    for (const row of rows) {
      insert.run(cols.map((col) => row[col] ?? null));
    }
    insert.free();
  }
}

export function getDirectoryDb() {
  if (!directoryDb) {
    throw new Error("Directory account non inizializzata.");
  }
  return directoryDb;
}

export function getDb() {
  if (!database) {
    throw new Error("Cassaforte non sbloccata. Accedi per leggere i dati.");
  }
  return database;
}

export function isVaultUnlocked() {
  return Boolean(database && vaultDek && activeUserId);
}

export function getActiveVaultUserId() {
  return activeUserId;
}

/** Open the unencrypted account directory (usernames + password verifiers only). */
export async function openDirectory() {
  await ensureSqlRuntime();
  if (directoryDb) return directoryDb;

  const stored = asBytes(await idbGet(DIRECTORY_KEY));
  directoryDb = stored ? new sqlRuntime!.Database(stored) : new sqlRuntime!.Database();
  applyDirectorySchema(directoryDb);

  // One-time bootstrap from the legacy shared plaintext DB.
  if (!stored) {
    const legacy = asBytes(await idbGet(LEGACY_KEY));
    if (legacy && isSqliteFile(legacy)) {
      const legacyDb = new sqlRuntime!.Database(legacy);
      try {
        applyVaultSchema(legacyDb);
        const users = selectObjects(
          legacyDb,
          "SELECT id, name, username, password_salt, password_hash, created_at FROM users"
        );
        for (const row of users) {
          directoryDb.run(
            `INSERT OR IGNORE INTO users
              (id, name, username, password_salt, password_hash, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              row.id,
              row.name,
              row.username,
              row.password_salt,
              row.password_hash,
              row.created_at,
            ]
          );
        }
      } finally {
        legacyDb.close();
      }
    }
    await idbPut(DIRECTORY_KEY, directoryDb.export());
  }

  return directoryDb;
}

async function persistDirectory() {
  await idbPut(DIRECTORY_KEY, getDirectoryDb().export());
}

async function saveVaultBlob(userId: string, dek: VaultKey, plain: Uint8Array) {
  const encrypted = await encryptBytes(dek, plain);
  await idbPut(`${VAULT_KEY_PREFIX}${userId}`, packEncryptedBlob(encrypted.iv, encrypted.ciphertext));
}

async function loadVaultBlob(userId: string) {
  const raw = await idbGet(`${VAULT_KEY_PREFIX}${userId}`);
  if (!raw || typeof raw !== "object") return null;
  const blob = raw as EncryptedBlob;
  if (blob.v !== 1 || typeof blob.iv !== "string" || typeof blob.ciphertext !== "string") {
    return null;
  }
  return unpackEncryptedBlob(blob);
}

function setActiveVault(userId: string, db: Database, dek: VaultKey) {
  if (database && database !== db) {
    try {
      database.close();
    } catch {
      // ignore
    }
  }
  database = db;
  activeUserId = userId;
  vaultDek = dek;
  rememberSessionDek(dek);
}

export async function lockVault() {
  clearSessionDek();
  vaultDek = null;
  activeUserId = null;
  if (database) {
    try {
      database.close();
    } catch {
      // ignore
    }
  }
  database = null;
}

async function createEmptyVaultDb(userId: string) {
  await ensureSqlRuntime();
  const db = new sqlRuntime!.Database();
  applyVaultSchema(db);
  const dir = getDirectoryDb();
  copyUserRow(dir, db, userId);
  return db;
}

async function migrateLegacyUserVault(userId: string, password: string) {
  const legacy = asBytes(await idbGet(LEGACY_KEY));
  if (!legacy || !isSqliteFile(legacy)) {
    return createEmptyVaultDb(userId);
  }
  await ensureSqlRuntime();
  const legacyDb = new sqlRuntime!.Database(legacy);
  try {
    applyVaultSchema(legacyDb);
    const vault = await createEmptyVaultDb(userId);
    copyUserData(legacyDb, vault, userId);
    const dek = await generateDek();
    const kekSalt = crypto.getRandomValues(new Uint8Array(16));
    const kek = await deriveKek(password, kekSalt);
    const wrapped = await wrapDek(kek, dek);
    getDirectoryDb().run(
      "UPDATE users SET kek_salt = ?, wrap_iv = ?, wrapped_dek = ? WHERE id = ?",
      [
        bytesToBase64(kekSalt),
        bytesToBase64(wrapped.iv),
        bytesToBase64(wrapped.wrapped),
        userId,
      ]
    );
    await persistDirectory();
    await saveVaultBlob(userId, dek, vault.export());
    setActiveVault(userId, vault, dek);
    return vault;
  } finally {
    legacyDb.close();
  }
}

/** Create an encrypted personal vault for a newly registered account. */
export async function provisionUserVault(
  userId: string,
  password: string,
  seedPlain?: Uint8Array | null
) {
  await openDirectory();
  const dek = await generateDek();
  const kekSalt = crypto.getRandomValues(new Uint8Array(16));
  const kek = await deriveKek(password, kekSalt);
  const wrapped = await wrapDek(kek, dek);

  getDirectoryDb().run(
    "UPDATE users SET kek_salt = ?, wrap_iv = ?, wrapped_dek = ? WHERE id = ?",
    [
      bytesToBase64(kekSalt),
      bytesToBase64(wrapped.iv),
      bytesToBase64(wrapped.wrapped),
      userId,
    ]
  );
  await persistDirectory();

  let vault: Database;
  if (seedPlain && isSqliteFile(seedPlain)) {
    await ensureSqlRuntime();
    const source = new sqlRuntime!.Database(seedPlain);
    try {
      applyVaultSchema(source);
      vault = await createEmptyVaultDb(userId);
      copyUserData(source, vault, userId);
    } finally {
      source.close();
    }
  } else {
    vault = await createEmptyVaultDb(userId);
  }

  await saveVaultBlob(userId, dek, vault.export());
  setActiveVault(userId, vault, dek);
  return vault;
}

/** Unlock the personal encrypted vault with the account password. */
export async function unlockUserVault(userId: string, password: string) {
  await openDirectory();
  const wrapRow = selectObjects(
    getDirectoryDb(),
    "SELECT kek_salt, wrap_iv, wrapped_dek FROM users WHERE id = ?",
    [userId]
  )[0];
  const kekSaltB64 = (wrapRow?.kek_salt as string | null) ?? null;
  const wrapIvB64 = (wrapRow?.wrap_iv as string | null) ?? null;
  const wrappedB64 = (wrapRow?.wrapped_dek as string | null) ?? null;

  if (!kekSaltB64 || !wrapIvB64 || !wrappedB64) {
    return migrateLegacyUserVault(userId, password);
  }

  const kek = await deriveKek(password, base64ToBytes(kekSaltB64));
  let dek: VaultKey;
  try {
    dek = await unwrapDek(kek, base64ToBytes(wrapIvB64), base64ToBytes(wrappedB64));
  } catch {
    throw new Error("Email o password non corretti.");
  }

  const packed = await loadVaultBlob(userId);
  if (!packed) {
    return migrateLegacyUserVault(userId, password);
  }

  let plain: Uint8Array;
  try {
    plain = await decryptBytes(dek, packed.iv, packed.ciphertext);
  } catch {
    throw new Error("Impossibile aprire la cassaforte. Controlla la password.");
  }

  await ensureSqlRuntime();
  const vault = new sqlRuntime!.Database(plain);
  applyVaultSchema(vault);
  setActiveVault(userId, vault, dek);
  return vault;
}

/** Restore an already-unlocked vault after a soft refresh (same browser tab). */
export async function resumeVaultSession(userId: string) {
  await openDirectory();
  const dek = await readSessionDek();
  if (!dek) return false;
  const packed = await loadVaultBlob(userId);
  if (!packed) return false;
  try {
    const plain = await decryptBytes(dek, packed.iv, packed.ciphertext);
    await ensureSqlRuntime();
    const vault = new sqlRuntime!.Database(plain);
    applyVaultSchema(vault);
    setActiveVault(userId, vault, dek);
    return true;
  } catch {
    clearSessionDek();
    return false;
  }
}

function requireUnlockedDek(userId: string) {
  if (!vaultDek || activeUserId !== userId) {
    throw new Error("Sblocca l’account prima di continuare.");
  }
  return vaultDek;
}

async function openVaultWithDek(userId: string, dek: VaultKey) {
  const packed = await loadVaultBlob(userId);
  if (!packed) {
    throw new Error("Cassaforte non trovata su questo dispositivo.");
  }
  let plain: Uint8Array;
  try {
    plain = await decryptBytes(dek, packed.iv, packed.ciphertext);
  } catch {
    throw new Error("Impossibile aprire la cassaforte.");
  }
  await ensureSqlRuntime();
  const vault = new sqlRuntime!.Database(plain);
  applyVaultSchema(vault);
  setActiveVault(userId, vault, dek);
  return vault;
}

/** Enable PIN unlock while the vault is open. */
export async function enablePinUnlock(userId: string, pin: string) {
  const dek = requireUnlockedDek(userId);
  const { hashPin } = await import("@/lib/account-security");
  const pinSecret = await hashPin(pin);
  const pinKekSalt = crypto.getRandomValues(new Uint8Array(16));
  const pinKek = await deriveKek(pin, pinKekSalt);
  const wrapped = await wrapDek(pinKek, dek);
  getDirectoryDb().run(
    `UPDATE users SET
      pin_enabled = 1,
      pin_salt = ?,
      pin_hash = ?,
      pin_kek_salt = ?,
      pin_wrap_iv = ?,
      pin_wrapped_dek = ?
     WHERE id = ?`,
    [
      pinSecret.salt,
      pinSecret.hash,
      bytesToBase64(pinKekSalt),
      bytesToBase64(wrapped.iv),
      bytesToBase64(wrapped.wrapped),
      userId,
    ]
  );
  await persistDirectory();
}

/** Disable PIN unlock. */
export async function disablePinUnlock(userId: string) {
  requireUnlockedDek(userId);
  getDirectoryDb().run(
    `UPDATE users SET
      pin_enabled = 0,
      pin_salt = NULL,
      pin_hash = NULL,
      pin_kek_salt = NULL,
      pin_wrap_iv = NULL,
      pin_wrapped_dek = NULL
     WHERE id = ?`,
    [userId]
  );
  await persistDirectory();
}

/** Unlock the personal encrypted vault with the account PIN. */
export async function unlockUserVaultWithPin(userId: string, pin: string) {
  await openDirectory();
  const row = selectObjects(
    getDirectoryDb(),
    `SELECT pin_enabled, pin_salt, pin_hash, pin_kek_salt, pin_wrap_iv, pin_wrapped_dek
     FROM users WHERE id = ?`,
    [userId]
  )[0];
  if (!row || Number(row.pin_enabled) !== 1) {
    throw new Error("Accesso con PIN non abilitato per questo account.");
  }
  const pinSalt = String(row.pin_salt ?? "");
  const pinHash = String(row.pin_hash ?? "");
  const { verifyPin } = await import("@/lib/account-security");
  if (!(await verifyPin(pin, pinSalt, pinHash))) {
    throw new Error("PIN non corretto.");
  }
  const pinKekSaltB64 = String(row.pin_kek_salt ?? "");
  const pinWrapIvB64 = String(row.pin_wrap_iv ?? "");
  const pinWrappedB64 = String(row.pin_wrapped_dek ?? "");
  if (!pinKekSaltB64 || !pinWrapIvB64 || !pinWrappedB64) {
    throw new Error("PIN non configurato correttamente.");
  }
  const pinKek = await deriveKek(pin, base64ToBytes(pinKekSaltB64));
  let dek: VaultKey;
  try {
    dek = await unwrapDek(pinKek, base64ToBytes(pinWrapIvB64), base64ToBytes(pinWrappedB64));
  } catch {
    throw new Error("PIN non corretto.");
  }
  return openVaultWithDek(userId, dek);
}

/**
 * Link/update recovery email and wrap the DEK with a recovery secret
 * (must be called while the vault is unlocked).
 */
export async function linkAccountEmail(userId: string, email: string) {
  const dek = requireUnlockedDek(userId);
  const {
    createRecoverySecret,
    isValidEmail,
    normalizeEmail,
    recoverySecretToToken,
    sealRecoverySecret,
  } = await import("@/lib/account-security");
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error("Inserisci un’email valida.");
  }
  const recoverySecret = createRecoverySecret();
  const recoveryKekSalt = crypto.getRandomValues(new Uint8Array(16));
  const recoveryKek = await deriveKek(recoverySecretToToken(recoverySecret), recoveryKekSalt);
  const wrapped = await wrapDek(recoveryKek, dek);
  const sealed = await sealRecoverySecret(userId, normalized, recoverySecret);
  getDirectoryDb().run(
    `UPDATE users SET
      email = ?,
      recovery_kek_salt = ?,
      recovery_wrap_iv = ?,
      recovery_wrapped_dek = ?,
      recovery_secret_blob = ?
     WHERE id = ?`,
    [
      normalized,
      bytesToBase64(recoveryKekSalt),
      bytesToBase64(wrapped.iv),
      bytesToBase64(wrapped.wrapped),
      JSON.stringify(sealed),
      userId,
    ]
  );
  await persistDirectory();
  return normalized;
}

export async function clearAccountEmail(userId: string) {
  requireUnlockedDek(userId);
  getDirectoryDb().run(
    `UPDATE users SET
      email = NULL,
      recovery_kek_salt = NULL,
      recovery_wrap_iv = NULL,
      recovery_wrapped_dek = NULL,
      recovery_secret_blob = NULL
     WHERE id = ?`,
    [userId]
  );
  await persistDirectory();
}

async function unwrapDekWithRecoverySecret(userId: string, recoverySecret: Uint8Array) {
  const row = selectObjects(
    getDirectoryDb(),
    `SELECT recovery_kek_salt, recovery_wrap_iv, recovery_wrapped_dek
     FROM users WHERE id = ?`,
    [userId]
  )[0];
  const kekSaltB64 = String(row?.recovery_kek_salt ?? "");
  const wrapIvB64 = String(row?.recovery_wrap_iv ?? "");
  const wrappedB64 = String(row?.recovery_wrapped_dek ?? "");
  if (!kekSaltB64 || !wrapIvB64 || !wrappedB64) {
    throw new Error("Recupero non configurato per questo account.");
  }
  const { recoverySecretToToken } = await import("@/lib/account-security");
  const token = recoverySecretToToken(recoverySecret);
  const kek = await deriveKek(token, base64ToBytes(kekSaltB64));
  try {
    return await unwrapDek(kek, base64ToBytes(wrapIvB64), base64ToBytes(wrappedB64));
  } catch {
    throw new Error("Link di recupero non valido.");
  }
}

/** Build recovery material for an account looked up by username or email (vault stays locked). */
export async function preparePasswordRecovery(usernameOrEmail: string) {
  await openDirectory();
  const { normalizeEmail, recoverySecretToToken, unsealRecoverySecret } = await import(
    "@/lib/account-security"
  );
  const raw = usernameOrEmail.trim();
  if (!raw) {
    throw new Error("Inserisci username o email.");
  }
  const byUsername = selectObjects(
    getDirectoryDb(),
    "SELECT * FROM users WHERE username = ? COLLATE NOCASE",
    [raw]
  )[0];
  const byEmail = selectObjects(
    getDirectoryDb(),
    "SELECT * FROM users WHERE email = ? COLLATE NOCASE",
    [normalizeEmail(raw)]
  )[0];
  const row = byUsername ?? byEmail;
  if (!row) {
    throw new Error("Nessun account trovato con questi dati.");
  }
  const email = String(row.email ?? "");
  const blobRaw = String(row.recovery_secret_blob ?? "");
  if (!email || !blobRaw) {
    throw new Error(
      "Questo account non ha un’email di recupero collegata. Accedi e collegala dal menu account."
    );
  }
  let blob: { v: 1; iv: string; ciphertext: string };
  try {
    blob = JSON.parse(blobRaw) as { v: 1; iv: string; ciphertext: string };
  } catch {
    throw new Error("Dati di recupero non validi. Ricongiungi l’email dal menu account.");
  }
  const secret = await unsealRecoverySecret(String(row.id), email, blob);
  // Ensure the secret still opens the vault before emailing a link.
  await unwrapDekWithRecoverySecret(String(row.id), secret);
  return {
    userId: String(row.id),
    name: String(row.name),
    username: String(row.username),
    email,
    token: recoverySecretToToken(secret),
  };
}

/** Complete password reset from a recovery link (unlocks vault and rewraps with the new password). */
export async function completePasswordRecovery(
  userId: string,
  recoveryToken: string,
  newPassword: string
) {
  await openDirectory();
  if (newPassword.length < 6) {
    throw new Error("La password deve avere almeno 6 caratteri.");
  }
  const { recoveryTokenToSecret } = await import("@/lib/account-security");
  const secret = recoveryTokenToSecret(recoveryToken);
  const dek = await unwrapDekWithRecoverySecret(userId, secret);
  await openVaultWithDek(userId, dek);

  const { hashPassword } = await import("@/lib/password");
  const passwordSecret = await hashPassword(newPassword);
  const kekSalt = crypto.getRandomValues(new Uint8Array(16));
  const kek = await deriveKek(newPassword, kekSalt);
  const wrapped = await wrapDek(kek, dek);

  // Rotate recovery wraps so the emailed link cannot be reused forever after reset.
  const {
    createRecoverySecret,
    sealRecoverySecret,
    recoverySecretToToken,
  } = await import("@/lib/account-security");
  const emailRow = selectObjects(
    getDirectoryDb(),
    "SELECT email FROM users WHERE id = ?",
    [userId]
  )[0];
  const email = String(emailRow?.email ?? "");
  let recoveryUpdateSql = "";
  const recoveryParams: SqlValue[] = [];
  if (email) {
    const nextSecret = createRecoverySecret();
    const recoveryKekSalt = crypto.getRandomValues(new Uint8Array(16));
    const recoveryKek = await deriveKek(recoverySecretToToken(nextSecret), recoveryKekSalt);
    const recoveryWrapped = await wrapDek(recoveryKek, dek);
    const sealed = await sealRecoverySecret(userId, email, nextSecret);
    recoveryUpdateSql = `,
      recovery_kek_salt = ?,
      recovery_wrap_iv = ?,
      recovery_wrapped_dek = ?,
      recovery_secret_blob = ?`;
    recoveryParams.push(
      bytesToBase64(recoveryKekSalt),
      bytesToBase64(recoveryWrapped.iv),
      bytesToBase64(recoveryWrapped.wrapped),
      JSON.stringify(sealed)
    );
  }

  // PIN wrap uses the PIN itself; without the PIN we cannot refresh it after recovery.
  getDirectoryDb().run(
    `UPDATE users SET
      password_salt = ?,
      password_hash = ?,
      kek_salt = ?,
      wrap_iv = ?,
      wrapped_dek = ?,
      pin_enabled = 0,
      pin_salt = NULL,
      pin_hash = NULL,
      pin_kek_salt = NULL,
      pin_wrap_iv = NULL,
      pin_wrapped_dek = NULL
      ${recoveryUpdateSql}
     WHERE id = ?`,
    [
      passwordSecret.salt,
      passwordSecret.hash,
      bytesToBase64(kekSalt),
      bytesToBase64(wrapped.iv),
      bytesToBase64(wrapped.wrapped),
      ...recoveryParams,
      userId,
    ]
  );
  await persistDirectory();
  await persistNow();
}

export async function openSqlite() {
  await openDirectory();
  return getDirectoryDb();
}

export async function persistNow() {
  await persistDirectory();
  if (!database || !vaultDek || !activeUserId) return;
  await saveVaultBlob(activeUserId, vaultDek, database.export());
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
  if (!activeUserId || !vaultDek) {
    throw new Error("Accedi per importare dati nella tua cassaforte.");
  }
  database?.close();
  database = new sqlRuntime.Database(bytes);
  applyVaultSchema(database);
  // Keep FK user row aligned with the unlocked account.
  copyUserRow(getDirectoryDb(), database, activeUserId);
  await persistNow();
}

export async function wipeSqlite() {
  await lockVault();
  clearSessionDek();
  if (directoryDb) {
    try {
      directoryDb.close();
    } catch {
      // ignore
    }
  }
  directoryDb = null;

  const idb = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Reset storage non riuscito."));
  });
  await openDirectory();
}

/** Load a plaintext seed DB, create directory + encrypted vault for the seed user. */
export async function installPlaintextSeed(bytes: Uint8Array, passwordForWrap: string) {
  if (!isSqliteFile(bytes)) {
    throw new Error("Il file seed non è un database SQLite valido.");
  }
  await wipeSqlite();
  await ensureSqlRuntime();
  const source = new sqlRuntime!.Database(bytes);
  try {
    applyVaultSchema(source);
    const users = selectObjects(
      source,
      "SELECT id, name, username, password_salt, password_hash, created_at FROM users"
    );
    for (const row of users) {
      getDirectoryDb().run(
        `INSERT OR REPLACE INTO users
          (id, name, username, password_salt, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.name,
          row.username,
          row.password_salt,
          row.password_hash,
          row.created_at,
        ]
      );
    }
    await persistDirectory();

    const seedUserId = String(users[0]?.id ?? "");
    if (!seedUserId) {
      throw new Error("Seed senza utenti.");
    }

    // Prefer wrapping with the provided password; also keep a session unlock.
    const vault = await createEmptyVaultDb(seedUserId);
    copyUserData(source, vault, seedUserId);
    const dek = await generateDek();
    const kekSalt = crypto.getRandomValues(new Uint8Array(16));
    const kek = await deriveKek(passwordForWrap, kekSalt);
    const wrapped = await wrapDek(kek, dek);
    getDirectoryDb().run(
      "UPDATE users SET kek_salt = ?, wrap_iv = ?, wrapped_dek = ? WHERE id = ?",
      [
        bytesToBase64(kekSalt),
        bytesToBase64(wrapped.iv),
        bytesToBase64(wrapped.wrapped),
        seedUserId,
      ]
    );
    await persistDirectory();
    await saveVaultBlob(seedUserId, dek, vault.export());
    setActiveVault(seedUserId, vault, dek);
    // Remove legacy plaintext shared DB if present.
    await idbDelete(LEGACY_KEY);
    return seedUserId;
  } finally {
    source.close();
  }
}

if (typeof window !== "undefined") {
  prefetchSqliteRuntime();
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

/** Auth directory queries — never touch the encrypted vault. */
export function runDirectorySql(sql: string, params: SqlValue[] = []) {
  getDirectoryDb().run(sql, params);
}

export function queryDirectorySql<T extends object>(sql: string, params: SqlValue[] = []) {
  const statement = getDirectoryDb().prepare(sql);
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

export function queryDirectoryOneSql<T extends object>(sql: string, params: SqlValue[] = []) {
  return queryDirectorySql<T>(sql, params)[0];
}

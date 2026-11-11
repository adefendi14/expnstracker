import { pbkdf2Async } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";

/** Minimum length for new passwords (registration). Login only checks the hash. */
export const PASSWORD_MIN_LENGTH = 4;

/** Max length guard — keeps input usable. */
export const PASSWORD_MAX_LENGTH = 128;

const PBKDF2_ITERATIONS = 120_000;
const PBKDF2_DK_LEN = 32;

/**
 * Relaxed registration rules: short minimum, no complexity requirements,
 * and common symbols (! @ . - _ , ; : and the rest of printable text) are fine.
 * Login never runs this — it only verifies the stored hash.
 */
export function assertPassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`La password deve avere almeno ${PASSWORD_MIN_LENGTH} caratteri.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`La password può avere al massimo ${PASSWORD_MAX_LENGTH} caratteri.`);
  }
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * PBKDF2-SHA256 via @noble/hashes so hashing works on plain HTTP
 * (crypto.subtle is unavailable outside secure contexts).
 */
export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2Async(sha256, new TextEncoder().encode(password), salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: PBKDF2_DK_LEN,
  });
  return { hash: bytesToHex(derived), salt: bytesToHex(salt) };
}

export async function verifyPassword(password: string, saltHex: string, hashHex: string) {
  const next = await hashPassword(password, saltHex);
  return timingSafeEqual(next.hash, hashHex);
}

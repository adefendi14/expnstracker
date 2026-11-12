import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hasWebCryptoSubtle } from "@/lib/secure-context";

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

export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  if (hasWebCryptoSubtle()) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: 120_000 },
      material,
      256
    );
    return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
  }
  const hash = pbkdf2(sha256, password, salt, { c: 120_000, dkLen: 32 });
  return { hash: bytesToHex(hash), salt: bytesToHex(salt) };
}

export async function verifyPassword(password: string, saltHex: string, hashHex: string) {
  const next = await hashPassword(password, saltHex);
  return timingSafeEqual(next.hash, hashHex);
}

import { gcm } from "@noble/ciphers/aes.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hasWebCryptoSubtle } from "@/lib/secure-context";

const textEncoder = new TextEncoder();

/** AES-256 key: Web Crypto when available, otherwise pure JS (HTTP / IP hosts). */
export type VaultKey =
  | { backend: "subtle"; key: CryptoKey }
  | { backend: "noble"; key: Uint8Array };

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string) {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function deriveKeyBytes(password: string, salt: Uint8Array, iterations: number) {
  if (hasWebCryptoSubtle()) {
    const material = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
      material,
      256
    );
    return new Uint8Array(bits);
  }
  return pbkdf2(sha256, password, salt, { c: iterations, dkLen: 32 });
}

async function importAesKey(raw: Uint8Array): Promise<VaultKey> {
  if (hasWebCryptoSubtle()) {
    const key = await crypto.subtle.importKey(
      "raw",
      raw as BufferSource,
      { name: "AES-GCM", length: 256 },
      true,
      ["wrapKey", "unwrapKey", "encrypt", "decrypt"]
    );
    return { backend: "subtle", key };
  }
  return { backend: "noble", key: raw.slice() };
}

/** Key-encryption key from the account password. */
export async function deriveKek(password: string, salt: Uint8Array) {
  const raw = await deriveKeyBytes(password, salt, 210_000);
  return importAesKey(raw);
}

export async function generateDek() {
  if (hasWebCryptoSubtle()) {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
      "encrypt",
      "decrypt",
    ]);
    return { backend: "subtle" as const, key };
  }
  return { backend: "noble" as const, key: randomBytes(32) };
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes.slice() as BufferSource;
}

async function aesGcmEncrypt(key: VaultKey, iv: Uint8Array, plain: Uint8Array) {
  if (key.backend === "subtle") {
    return new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: asBufferSource(iv) },
        key.key,
        asBufferSource(plain)
      )
    );
  }
  return gcm(key.key, iv).encrypt(plain);
}

async function aesGcmDecrypt(key: VaultKey, iv: Uint8Array, ciphertext: Uint8Array) {
  if (key.backend === "subtle") {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: asBufferSource(iv) },
        key.key,
        asBufferSource(ciphertext)
      )
    );
  }
  return gcm(key.key, iv).decrypt(ciphertext);
}

export async function wrapDek(kek: VaultKey, dek: VaultKey) {
  const iv = randomBytes(12);
  const rawDek = await exportDekRaw(dek);
  const wrapped = await aesGcmEncrypt(kek, iv, rawDek);
  return { iv, wrapped };
}

export async function unwrapDek(kek: VaultKey, iv: Uint8Array, wrapped: Uint8Array) {
  const raw = await aesGcmDecrypt(kek, iv, wrapped);
  return importDekRaw(raw);
}

export async function encryptBytes(dek: VaultKey, plain: Uint8Array) {
  const iv = randomBytes(12);
  const ciphertext = await aesGcmEncrypt(dek, iv, plain);
  return { iv, ciphertext };
}

export async function decryptBytes(dek: VaultKey, iv: Uint8Array, ciphertext: Uint8Array) {
  return aesGcmDecrypt(dek, iv, ciphertext);
}

export async function exportDekRaw(dek: VaultKey) {
  if (dek.backend === "subtle") {
    return new Uint8Array(await crypto.subtle.exportKey("raw", dek.key));
  }
  return dek.key.slice();
}

export async function importDekRaw(raw: Uint8Array) {
  return importAesKey(raw);
}

export type EncryptedBlob = {
  v: 1;
  iv: string;
  ciphertext: string;
};

export function packEncryptedBlob(iv: Uint8Array, ciphertext: Uint8Array): EncryptedBlob {
  return { v: 1, iv: bytesToBase64(iv), ciphertext: bytesToBase64(ciphertext) };
}

export function unpackEncryptedBlob(blob: EncryptedBlob) {
  return {
    iv: base64ToBytes(blob.iv),
    ciphertext: base64ToBytes(blob.ciphertext),
  };
}

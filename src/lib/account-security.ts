import {
  bytesToBase64,
  base64ToBytes,
  bytesToHex,
  decryptBytes,
  deriveKek,
  encryptBytes,
  hexToBytes,
  packEncryptedBlob,
  unpackEncryptedBlob,
} from "@/lib/vault-crypto";
import { hashPassword, verifyPassword } from "@/lib/password";
import { withBase } from "@/lib/paths";

const EMAIL_RECOVERY_PEPPER = "expnstracker.email-recovery.v1";

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function isValidPin(value: string) {
  return /^\d{4,6}$/.test(value);
}

export async function hashPin(pin: string, saltHex?: string) {
  return hashPassword(pin, saltHex);
}

export async function verifyPin(pin: string, saltHex: string, hashHex: string) {
  return verifyPassword(pin, saltHex, hashHex);
}

async function emailRecoveryKek(userId: string, email: string) {
  const salt = new TextEncoder().encode(`${EMAIL_RECOVERY_PEPPER}:${userId}`);
  return deriveKek(`${normalizeEmail(email)}|${userId}|${EMAIL_RECOVERY_PEPPER}`, salt);
}

/** Seal the vault recovery secret so forgot-password can reopen the vault via email/username. */
export async function sealRecoverySecret(userId: string, email: string, recoverySecret: Uint8Array) {
  const kek = await emailRecoveryKek(userId, email);
  const encrypted = await encryptBytes(kek, recoverySecret);
  return packEncryptedBlob(encrypted.iv, encrypted.ciphertext);
}

export async function unsealRecoverySecret(
  userId: string,
  email: string,
  blob: { v: 1; iv: string; ciphertext: string }
) {
  const kek = await emailRecoveryKek(userId, email);
  const packed = unpackEncryptedBlob(blob);
  return decryptBytes(kek, packed.iv, packed.ciphertext);
}

export function createRecoverySecret() {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function recoverySecretToToken(secret: Uint8Array) {
  return bytesToHex(secret);
}

export function recoveryTokenToSecret(token: string) {
  const clean = token.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(clean) || clean.length < 32 || clean.length % 2 !== 0) {
    throw new Error("Link di recupero non valido.");
  }
  return hexToBytes(clean);
}

export function buildRecoveryUrl(userId: string, token: string) {
  if (typeof window === "undefined") {
    return withBase(`/?recupero=${encodeURIComponent(`${userId}.${token}`)}`);
  }
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("recupero", `${userId}.${token}`);
  return url.toString();
}

export function buildRecoveryEmailHtml(params: {
  name: string;
  username: string;
  recoveryUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recupero password ExpnsTracker</title>
</head>
<body style="margin:0;padding:24px;background:#0f0f10;color:#f4f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;background:#1c1c1e;border-radius:24px;padding:28px;">
    <tr><td>
      <p style="margin:0 0 8px;color:#e39e94;font-size:13px;font-weight:600;">ExpnsTracker</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Reimposta la password</h1>
      <p style="margin:0 0 16px;color:#a1a1aa;font-size:14px;line-height:1.5;">
        Ciao ${escapeHtml(params.name)}, abbiamo ricevuto una richiesta di recupero per l’account
        <strong style="color:#f4f3ef;">@${escapeHtml(params.username)}</strong>.
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:14px;line-height:1.5;">
        Apri il pulsante qui sotto sul dispositivo dove usi ExpnsTracker, poi scegli una nuova password.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${params.recoveryUrl}" style="display:inline-block;background:#ce7f77;color:#fffaf8;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:600;">
          Cambia password
        </a>
      </p>
      <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
        Se non hai richiesto tu il recupero, ignora questa email. Il link funziona solo su questo account locale.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type RecoveryDispatchResult =
  | { channel: "email"; detail: string }
  | { channel: "download"; detail: string; filename: string }
  | { channel: "clipboard"; detail: string };

/**
 * Tries a mail API when available; otherwise downloads the HTML recovery message
 * (needed on static hosts like GitHub Pages with no backend).
 */
export async function dispatchRecoveryEmail(params: {
  to: string;
  name: string;
  username: string;
  recoveryUrl: string;
}): Promise<RecoveryDispatchResult> {
  const html = buildRecoveryEmailHtml(params);
  const subject = "Recupero password ExpnsTracker";

  try {
    const response = await fetch(withBase("/api/send-recovery"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        to: params.to,
        subject,
        html,
        name: params.name,
        username: params.username,
        recoveryUrl: params.recoveryUrl,
      }),
    });
    if (response.ok) {
      return { channel: "email", detail: `Email inviata a ${params.to}` };
    }
  } catch {
    // Static export / offline: fall through.
  }

  const filename = `expnstracker-recupero-${params.username}.html`;
  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return {
      channel: "download",
      filename,
      detail:
        "Nessun servizio email configurato: ho scaricato l’HTML di recupero da aprire o inoltrare alla mail dell’account.",
    };
  } catch {
    await navigator.clipboard.writeText(params.recoveryUrl);
    return {
      channel: "clipboard",
      detail: "Link di recupero copiato negli appunti.",
    };
  }
}

export { bytesToBase64, base64ToBytes };

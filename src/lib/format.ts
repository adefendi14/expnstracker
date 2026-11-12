import type { ExpenseCategory, Priority, Risk } from "@/lib/types";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

const euroCompact = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const longDate = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const shortDate = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatEuro(value: number): string {
  return euro.format(value);
}

export function formatEuroCompact(value: number): string {
  return `${euroCompact.format(value)}€`;
}

export function formatLongDate(iso = new Date().toISOString()): string {
  const date = iso.includes("T") ? new Date(iso) : new Date(`${iso}T12:00:00`);
  const text = longDate.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShortDate(iso?: string): string {
  if (!iso) return "";
  const date = iso.includes("T") ? new Date(iso) : new Date(`${iso}T12:00:00`);
  return shortDate.format(date);
}

export function dayKeyFromIso(iso: string): string {
  const date = iso.includes("T") ? new Date(iso) : new Date(`${iso}T12:00:00`);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Mini heading between transaction groups: Oggi, Ieri, or a long Italian date. */
export function formatDayHeading(iso: string, now = new Date()): string {
  const key = dayKeyFromIso(iso);
  const today = dayKeyFromIso(now.toISOString());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayKeyFromIso(yesterdayDate.toISOString());
  if (key === today) return "Oggi";
  if (key === yesterday) return "Ieri";
  return formatLongDate(key);
}

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function parseEuroInput(raw: string): number | null {
  let text = raw.trim().replace(/\s/g, "").replace(/€/g, "");
  if (!text) return null;
  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function isThisMonth(iso: string): boolean {
  const date = iso.includes("T") ? new Date(iso) : new Date(`${iso}T12:00:00`);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  casa: "Casa",
  svago: "Svago",
  uscite: "Uscite",
  cibo: "Cibo",
  trasporti: "Trasporti",
  salute: "Salute",
  altro: "Altro",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  bassa: "Bassa",
  media: "Media",
  alta: "Alta",
};

export const RISK_LABELS: Record<Risk, string> = {
  basso: "Basso",
  medio: "Medio",
  alto: "Alto",
};

export const CATEGORY_ACCENT: Record<ExpenseCategory, string> = {
  casa: "bg-amber-50 text-amber-800",
  svago: "bg-violet-50 text-violet-800",
  uscite: "bg-sky-50 text-sky-800",
  cibo: "bg-orange-50 text-orange-800",
  trasporti: "bg-slate-100 text-slate-700",
  salute: "bg-rose-50 text-rose-800",
  altro: "bg-stone-100 text-stone-700",
};

type LedgerLike = {
  id?: string;
  amount: number;
  paid?: number;
  settled?: boolean;
  relatedLedgerId?: string;
};

function roundEuro(value: number) {
  return Math.round(value * 100) / 100;
}

export function isLedgerPayment(item: { relatedLedgerId?: string }) {
  return Boolean(item.relatedLedgerId);
}

export function linkedPaymentTotal(
  itemId: string,
  ledger: Array<{ relatedLedgerId?: string; amount: number }> = []
) {
  return roundEuro(
    ledger.filter((entry) => entry.relatedLedgerId === itemId).reduce((sum, entry) => sum + entry.amount, 0)
  );
}

/** Base paid field plus linked payment/storno rows (storno amounts are negative). */
export function ledgerPaid(
  item: { id?: string; paid?: number },
  ledger: Array<{ relatedLedgerId?: string; amount: number }> = []
) {
  const base = item.paid ?? 0;
  if (!item.id) return base;
  return roundEuro(base + linkedPaymentTotal(item.id, ledger));
}

export function ledgerRemaining(
  item: LedgerLike,
  ledger: Array<{ id?: string; relatedLedgerId?: string; amount: number }> = []
) {
  if (isLedgerPayment(item)) return 0;
  const linked = linkedPaymentTotal(item.id ?? "", ledger);
  // Legacy rows marked settled without linked payment rows stay closed.
  if (item.settled && linked === 0) return 0;
  return Math.max(0, roundEuro(item.amount - ledgerPaid(item, ledger)));
}

export function ledgerIsClosed(
  item: LedgerLike,
  ledger: Array<{ id?: string; relatedLedgerId?: string; amount: number }> = []
) {
  if (isLedgerPayment(item)) return true;
  return ledgerRemaining(item, ledger) <= 0;
}

export function normalizeLedgerTitle(title: string) {
  return title.trim().replace(/\s+/g, " ");
}

export function ledgerTitleKey(title: string) {
  return normalizeLedgerTitle(title).toLowerCase();
}

/** Principals associated with this entry (same association thread). */
export function associatedPrincipals<T extends { id: string; relatedLedgerId?: string; associatedLedgerId?: string }>(
  item: T,
  ledger: T[]
): T[] {
  if (isLedgerPayment(item)) return [];
  const root = item.associatedLedgerId ?? item.id;
  return ledger.filter((entry) => {
    if (isLedgerPayment(entry)) return false;
    if (entry.id === item.id) return false;
    const entryRoot = entry.associatedLedgerId ?? entry.id;
    return entryRoot === root || entry.id === root || entry.associatedLedgerId === item.id;
  });
}

export function ledgerPercent(
  item: { id?: string; amount: number; paid?: number },
  ledger: Array<{ relatedLedgerId?: string; amount: number }> = []
) {
  if (item.amount <= 0) return ledgerPaid(item, ledger) > 0 ? 100 : 0;
  return Math.min(100, Math.round((ledgerPaid(item, ledger) / item.amount) * 100));
}

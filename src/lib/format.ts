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

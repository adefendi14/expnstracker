import { ledgerRemaining } from "@/lib/format";
import type { AppData, PersonEvent, PersonProfile } from "@/lib/types";

export type PersonSummary = {
  person: PersonProfile;
  openCredits: number;
  openDebts: number;
  creditCount: number;
  debtCount: number;
  expensesTotal: number;
  lastActivity: string;
};

export type MonthSeries = {
  key: string;
  label: string;
  debiti: number;
  crediti: number;
  versamenti: number;
  spese: number;
};

export type ResidualPoint = {
  at: string;
  credits: number;
  debts: number;
};

export function normalizePersonName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizePersonKey(name: string) {
  return normalizePersonName(name).toLocaleLowerCase("it-IT");
}

export function personInitials(name: string) {
  const parts = normalizePersonName(name).split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function summarizePeople(data: AppData): PersonSummary[] {
  return data.people
    .map((person) => {
      const ledger = data.ledger.filter((item) => item.personId === person.id);
      const openCredits = ledger
        .filter((item) => item.direction === "credito" && !item.settled)
        .reduce((sum, item) => sum + ledgerRemaining(item), 0);
      const openDebts = ledger
        .filter((item) => item.direction === "debito" && !item.settled)
        .reduce((sum, item) => sum + ledgerRemaining(item), 0);
      const expenses = data.expenses.filter((item) => item.personId === person.id);
      const expensesTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
      const stamps = [
        ...ledger.map((item) => item.updatedAt || item.createdAt),
        ...expenses.map((item) => item.updatedAt || item.createdAt),
        person.updatedAt,
      ];
      const lastActivity = stamps.sort((a, b) => b.localeCompare(a))[0] ?? person.createdAt;
      return {
        person,
        openCredits: roundEuro(openCredits),
        openDebts: roundEuro(openDebts),
        creditCount: ledger.filter((item) => item.direction === "credito").length,
        debtCount: ledger.filter((item) => item.direction === "debito").length,
        expensesTotal: roundEuro(expensesTotal),
        lastActivity,
      };
    })
    .sort((a, b) => a.person.name.localeCompare(b.person.name, "it", { sensitivity: "base" }));
}

export function personRankings(summaries: PersonSummary[]) {
  return {
    topCredits: [...summaries]
      .filter((item) => item.openCredits > 0)
      .sort((a, b) => b.openCredits - a.openCredits)
      .slice(0, 3),
    topDebts: [...summaries]
      .filter((item) => item.openDebts > 0)
      .sort((a, b) => b.openDebts - a.openDebts)
      .slice(0, 3),
  };
}

export function eventsForPerson(data: AppData, personId: string) {
  return data.events
    .filter((item) => item.personId === personId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.createdAt.localeCompare(a.createdAt));
}

export function residualSeries(events: PersonEvent[]): ResidualPoint[] {
  const chronological = [...events].sort(
    (a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.createdAt.localeCompare(b.createdAt)
  );
  let credits = 0;
  let debts = 0;
  const points: ResidualPoint[] = [{ at: chronological[0]?.occurredAt ?? "", credits: 0, debts: 0 }];
  for (const event of chronological) {
    if (event.kind === "credito") credits += event.amount;
    else if (event.kind === "debito") debts += event.amount;
    else if (event.kind === "obiettivo") {
      if (event.direction === "credito") credits += event.amount;
      else debts += event.amount;
    } else if (event.kind === "versamento") {
      if (event.direction === "credito") credits = Math.max(0, credits - event.amount);
      else debts = Math.max(0, debts - event.amount);
    } else if (event.kind === "storno") {
      if (event.direction === "credito") credits += event.amount;
      else debts += event.amount;
    }
    points.push({
      at: event.occurredAt,
      credits: roundEuro(credits),
      debts: roundEuro(debts),
    });
  }
  return points;
}

export function monthlySeries(events: PersonEvent[], months = 6): MonthSeries[] {
  const buckets = new Map<string, MonthSeries>();
  const now = new Date();
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      key,
      label: date.toLocaleDateString("it-IT", { month: "short" }),
      debiti: 0,
      crediti: 0,
      versamenti: 0,
      spese: 0,
    });
  }
  for (const event of events) {
    const date = new Date(event.occurredAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (event.kind === "debito" || (event.kind === "obiettivo" && event.direction === "debito")) {
      bucket.debiti += event.amount;
    } else if (event.kind === "credito" || (event.kind === "obiettivo" && event.direction === "credito")) {
      bucket.crediti += event.amount;
    } else if (event.kind === "versamento") {
      bucket.versamenti += event.amount;
    } else if (event.kind === "spesa") {
      bucket.spese += event.amount;
    }
  }
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    debiti: roundEuro(bucket.debiti),
    crediti: roundEuro(bucket.crediti),
    versamenti: roundEuro(bucket.versamenti),
    spese: roundEuro(bucket.spese),
  }));
}

export function eventLabel(kind: PersonEvent["kind"]) {
  if (kind === "debito") return "Debito";
  if (kind === "credito") return "Credito";
  if (kind === "versamento") return "Versamento";
  if (kind === "storno") return "Storno";
  if (kind === "spesa") return "Spesa";
  return "Obiettivo";
}

function roundEuro(value: number) {
  return Math.round(value * 100) / 100;
}

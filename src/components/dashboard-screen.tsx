"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { InstallBanner } from "@/components/install-banner";
import { useStore } from "@/lib/store";
import {
  CATEGORY_LABELS,
  formatEuro,
  formatEuroCompact,
  formatLongDate,
  formatShortDate,
} from "@/lib/format";

export function DashboardScreen() {
  const { data, totals } = useStore();
  const hasAnything =
    data.ledger.length + data.expenses.length + data.ideas.length + data.piggyBanks.length > 0;

  const recent = [
    ...data.ledger.map((item) => ({
      id: item.id,
      href: `/elenco?tipo=${item.direction === "debito" ? "debiti" : "crediti"}`,
      title: item.person,
      meta: item.direction === "debito" ? "Debito" : "Credito",
      amount: `${item.direction === "debito" ? "−" : "+"}${formatEuro(item.amount)}`,
      tone: item.direction === "debito" ? "text-rose-700" : "text-emerald-700",
      at: item.updatedAt,
    })),
    ...data.expenses.map((item) => ({
      id: item.id,
      href: "/elenco?tipo=spese",
      title: item.notes || CATEGORY_LABELS[item.category],
      meta: `${CATEGORY_LABELS[item.category]} · ${formatShortDate(item.date)}`,
      amount: formatEuro(item.amount),
      tone: "text-foreground",
      at: item.updatedAt,
    })),
    ...data.ideas.map((item) => ({
      id: item.id,
      href: "/elenco?tipo=idee",
      title: item.title,
      meta: "Idea di investimento",
      amount: formatEuro(item.amount),
      tone: "text-indigo-700",
      at: item.updatedAt,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6">
      <div className="px-4 md:px-8">
        <p className="text-sm text-muted-foreground">{formatLongDate()}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Riepilogo</h1>
      </div>
      <InstallBanner />

      <div className="px-4 md:px-8">
        <section className="rounded-[1.75rem] bg-card p-6 ring-1 ring-foreground/8">
          <p className="text-sm text-muted-foreground">Saldo stimato</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">{formatEuro(totals.estimatedBalance)}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Salvadanai {formatEuroCompact(totals.piggyCurrent)} + crediti aperti{" "}
            {formatEuroCompact(totals.openCredits)} − debiti aperti {formatEuroCompact(totals.openDebts)}.
          </p>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 md:px-8">
        <article className="rounded-3xl bg-card p-4 ring-1 ring-foreground/8">
          <div className="flex size-8 items-center justify-center rounded-full bg-rose-50 text-rose-700">
            <ArrowUpRight className="size-4" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Debiti aperti</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{formatEuro(totals.openDebts)}</p>
        </article>
        <article className="rounded-3xl bg-card p-4 ring-1 ring-foreground/8">
          <div className="flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <ArrowDownLeft className="size-4" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Crediti aperti</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{formatEuro(totals.openCredits)}</p>
        </article>
      </div>

      <div className="px-4 md:px-8">
        <article className="rounded-3xl bg-card p-5 ring-1 ring-foreground/8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Progresso salvadanai</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatEuroCompact(totals.piggyCurrent)} / {formatEuroCompact(totals.piggyTarget)} —{" "}
                {totals.piggyPercent}%
              </p>
            </div>
            <PiggyBank className="size-4 text-amber-700" />
          </div>
          <Progress value={totals.piggyPercent} className="mt-4" />
          <p className="mt-3 text-xs text-muted-foreground">
            Spese di questo mese: {formatEuro(totals.monthExpenses)}
          </p>
        </article>
      </div>

      {!hasAnything ? (
        <div className="px-4 md:px-8">
          <EmptyState
            icon={<Wallet className="size-5" />}
            title="Nessun movimento ancora"
            description="Aggiungi un debito, una spesa o un obiettivo. Il saldo stimato si aggiorna da solo, tutto resta su questo iPhone."
            action={
              <Button nativeButton={false} render={<Link href="/aggiungi" />} className="h-11 rounded-2xl">
                Aggiungi il primo movimento
              </Button>
            }
          />
        </div>
      ) : (
        <section className="px-4 md:px-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Attività recente</h2>
            <Link href="/elenco" className="text-xs font-medium text-muted-foreground">
              Vedi tutto
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {recent.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/8"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
                  </div>
                  <p className={`text-sm font-medium ${item.tone}`}>{item.amount}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="px-4 md:px-8">
        <Button nativeButton={false} render={<Link href="/aggiungi" />} className="h-12 w-full rounded-2xl text-base">
          <Plus className="size-4" />
          Aggiungi
        </Button>
      </div>
    </div>
  );
}

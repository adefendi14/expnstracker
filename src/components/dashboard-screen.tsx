"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import {
  PiggySectionSkeleton,
  RecentRowSkeleton,
  RecentiSectionSkeleton,
  SummaryCardSkeleton,
} from "@/components/dashboard-skeletons";
import { EnterReveal, StaggerItem } from "@/components/motion";
import { PrivacyAmount } from "@/components/privacy-amount";
import { DashboardPiggySection } from "@/components/piggy-banks";
import { useStore } from "@/lib/store";
import {
  CATEGORY_LABELS,
  formatEuro,
  formatShortDate,
  isLedgerPayment,
  ledgerIsClosed,
  ledgerRemaining,
} from "@/lib/format";

export function DashboardScreen() {
  const { data, totals } = useStore();
  const hasRecent =
    data.ledger.length + data.expenses.length + data.ideas.length > 0;
  const openDebiti = data.ledger.filter(
    (item) => !isLedgerPayment(item) && item.direction === "debito" && !ledgerIsClosed(item, data.ledger)
  ).length;
  const openCrediti = data.ledger.filter(
    (item) => !isLedgerPayment(item) && item.direction === "credito" && !ledgerIsClosed(item, data.ledger)
  ).length;

  const recent = [
    ...data.ledger.map((item) => {
      const payment = isLedgerPayment(item);
      const href = `/cronologia/movimento?id=${encodeURIComponent(item.relatedLedgerId ?? item.id)}`;
      if (payment) {
        const label =
          item.notes === "Estinzione"
            ? "Estinzione"
            : item.amount < 0
              ? "Storno"
              : "Versamento";
        return {
          id: item.id,
          href,
          title: item.title || label,
          meta: `${item.person} · ${label}`,
          amount: `${item.amount < 0 ? "+" : "−"}${formatEuro(Math.abs(item.amount))}`,
          tone: item.amount < 0 ? "credit-pill" : "text-brand",
          at: item.updatedAt,
        };
      }
      return {
        id: item.id,
        href,
        title: item.title,
        meta: `${item.person} · ${item.direction === "debito" ? "Debito" : "Credito"}`,
        amount: `${item.direction === "debito" ? "−" : "+"}${formatEuro(ledgerRemaining(item, data.ledger))}`,
        tone: item.direction === "debito" ? "text-brand" : "credit-pill",
        at: item.updatedAt,
      };
    }),
    ...data.expenses.map((item) => ({
      id: item.id,
      href: "/cronologia?tipo=spese",
      title: item.notes || CATEGORY_LABELS[item.category],
      meta: `${CATEGORY_LABELS[item.category]} · ${formatShortDate(item.date)}`,
      amount: formatEuro(item.amount),
      tone: "text-foreground",
      at: item.updatedAt,
    })),
    ...data.ideas.map((item) => ({
      id: item.id,
      href: "/cronologia?tipo=idee",
      title: item.title,
      meta: "Idea",
      amount: formatEuro(item.amount),
      tone: "text-indigo-700",
      at: item.updatedAt,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6">
      <div className="grid grid-cols-2 gap-3 px-4 md:px-8">
        <EnterReveal skeleton={<SummaryCardSkeleton />}>
          <Link
            href="/cronologia/?tipo=debiti&stato=aperti"
            className="block rounded-3xl bg-card p-4 ring-1 ring-foreground/8 transition hover:bg-muted/40 hover:ring-foreground/12 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                <ArrowUpRight className="size-4" />
              </div>
              <p className="pt-0.5 text-right text-xs font-medium tabular-nums text-muted-foreground">
                {openDebiti} {openDebiti === 1 ? "aperto" : "aperti"}
              </p>
            </div>
            <p className="mt-3 text-xs font-medium text-brand">Debiti</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              <PrivacyAmount>{formatEuro(totals.openDebts)}</PrivacyAmount>
            </p>
          </Link>
        </EnterReveal>
        <EnterReveal delay={24} skeleton={<SummaryCardSkeleton />}>
          <Link
            href="/cronologia/?tipo=crediti&stato=aperti"
            className="block rounded-3xl bg-card p-4 ring-1 ring-foreground/8 transition hover:bg-muted/40 hover:ring-foreground/12 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                <ArrowDownLeft className="size-4" />
              </div>
              <p className="pt-0.5 text-right text-xs font-medium tabular-nums text-muted-foreground">
                {openCrediti} {openCrediti === 1 ? "aperto" : "aperti"}
              </p>
            </div>
            <p className="mt-3 text-xs font-medium text-brand">Crediti</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              <PrivacyAmount>{formatEuro(totals.openCredits)}</PrivacyAmount>
            </p>
          </Link>
        </EnterReveal>
      </div>

      {hasRecent ? (
        <div className="px-4 md:px-8">
          <EnterReveal delay={48} skeleton={<RecentiSectionSkeleton rows={recent.length || 3} />}>
            <article className="rounded-3xl bg-card p-5 ring-1 ring-foreground/8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-brand">Recenti</p>
                <Link
                  href="/cronologia"
                  className="inline-flex h-9 shrink-0 items-center rounded-full bg-brand-soft px-3 text-xs font-medium text-brand-soft-foreground transition-colors hover:bg-brand-soft/80"
                >
                  Tutti
                </Link>
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {recent.map((item, index) => (
                  <li key={item.id}>
                    <StaggerItem index={index} skeleton={<RecentRowSkeleton />}>
                      <Link
                        href={item.href}
                        className="flex w-full items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3 ring-1 ring-transparent transition hover:bg-muted hover:ring-foreground/8 active:scale-[0.99]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
                        </div>
                        <p
                          className={
                            item.tone === "credit-pill"
                              ? "inline-flex rounded-full bg-brand/35 px-2.5 py-0.5 text-sm font-medium text-black dark:text-white ring-1 ring-brand/40 backdrop-blur-md"
                              : `text-sm font-medium ${item.tone}`
                          }
                        >
                          <PrivacyAmount>{item.amount}</PrivacyAmount>
                        </p>
                      </Link>
                    </StaggerItem>
                  </li>
                ))}
              </ul>
            </article>
          </EnterReveal>
        </div>
      ) : null}

      <div className="px-4 md:px-8">
        <EnterReveal
          delay={72}
          skeleton={<PiggySectionSkeleton rows={Math.max(1, Math.min(3, data.piggyBanks.length || 3))} />}
        >
          <DashboardPiggySection />
        </EnterReveal>
      </div>
    </div>
  );
}

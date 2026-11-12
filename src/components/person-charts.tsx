"use client";

import { PrivacyAmount } from "@/components/privacy-amount";
import { usePrivacy } from "@/components/privacy-provider";
import { formatEuroCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MonthSeries, ResidualPoint } from "@/lib/people";

const STROKE_CREDIT = "var(--brand)";
const STROKE_DEBT = "color-mix(in oklab, var(--foreground) 55%, transparent)";

export function MonthBarsChart({ series }: { series: MonthSeries[] }) {
  const { hidden } = usePrivacy();
  const max = Math.max(
    1,
    ...series.flatMap((item) => [item.debiti, item.crediti, item.versamenti, item.spese])
  );
  const hasActivity = series.some(
    (item) => item.debiti + item.crediti + item.versamenti + item.spese > 0
  );

  return (
    <article className="rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/8">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-brand">Ultimi mesi</p>
        {!hasActivity ? (
          <p className="text-xs text-muted-foreground">Nessun movimento</p>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-5 flex items-end gap-2.5 transition-[filter] duration-200",
          hidden && "select-none blur-[7px]"
        )}
      >
        {series.map((item) => {
          const total = item.debiti + item.crediti + item.versamenti + item.spese;
          return (
            <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end justify-center gap-1 rounded-2xl bg-muted/40 px-1 pb-1 pt-2">
                <Bar value={item.debiti} max={max} className="bg-brand" hidden={hidden} />
                <Bar value={item.crediti} max={max} className="bg-foreground/70" hidden={hidden} />
                <Bar value={item.versamenti} max={max} className="bg-brand-soft-foreground/70" hidden={hidden} />
                <Bar value={item.spese} max={max} className="bg-muted-foreground/50" hidden={hidden} />
              </div>
              <p
                className={cn(
                  "text-[10px] font-medium capitalize",
                  total > 0 ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
        <LegendDot className="bg-brand" label="Debiti" />
        <LegendDot className="bg-foreground/70" label="Crediti" />
        <LegendDot className="bg-brand-soft-foreground/70" label="Versamenti" />
        <LegendDot className="bg-muted-foreground/50" label="Spese" />
      </ul>
    </article>
  );
}

export function ResidualChart({ points }: { points: ResidualPoint[] }) {
  const { hidden } = usePrivacy();
  const usable = points.filter((point) => point.at);
  const width = 320;
  const height = 148;
  const padX = 14;
  const padY = 16;
  const max = Math.max(1, ...usable.flatMap((point) => [point.credits, point.debts]));
  const last = usable[usable.length - 1];
  const net = (last?.credits ?? 0) - (last?.debts ?? 0);

  function pathFor(key: "credits" | "debts") {
    if (usable.length === 0) return "";
    return usable
      .map((point, index) => {
        const x = padX + (index / Math.max(1, usable.length - 1)) * (width - padX * 2);
        const y = height - padY - (point[key] / max) * (height - padY * 2);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  function areaFor(key: "credits" | "debts") {
    if (usable.length < 2) return "";
    const line = pathFor(key);
    const lastX = padX + ((usable.length - 1) / Math.max(1, usable.length - 1)) * (width - padX * 2);
    return `${line} L${lastX.toFixed(1)} ${height - padY} L${padX} ${height - padY} Z`;
  }

  return (
    <article className="rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/8">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-brand">Residuo nel tempo</p>
        {last ? (
          <p className={cn("text-xs font-medium tabular-nums", net >= 0 ? "text-foreground" : "text-brand")}>
            <PrivacyAmount>
              {net >= 0 ? "+" : "−"}
              {formatEuroCompact(Math.abs(net))}
            </PrivacyAmount>
          </p>
        ) : null}
      </div>
      {usable.length < 2 ? (
        <div className="mt-5 rounded-2xl bg-muted/40 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">Servono più punti per il grafico</p>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={cn("mt-4 h-40 w-full transition-[filter] duration-200", hidden && "select-none blur-[7px]")}
          role="img"
          aria-label="Residuo nel tempo"
        >
          <line
            x1={padX}
            x2={width - padX}
            y1={height - padY}
            y2={height - padY}
            stroke="currentColor"
            className="text-foreground/10"
            strokeWidth="1"
          />
          <path d={areaFor("debts")} fill="color-mix(in oklab, var(--brand) 16%, transparent)" />
          <path d={areaFor("credits")} fill="color-mix(in oklab, var(--foreground) 8%, transparent)" />
          <path d={pathFor("credits")} fill="none" stroke={STROKE_DEBT} strokeWidth="2.5" strokeLinecap="round" />
          <path d={pathFor("debts")} fill="none" stroke={STROKE_CREDIT} strokeWidth="2.75" strokeLinecap="round" />
        </svg>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <LegendDot className="bg-brand" label="Devi tu" />
        <LegendDot className="bg-foreground/55" label="Ti deve" />
      </ul>
    </article>
  );
}

function Bar({
  value,
  max,
  className,
  hidden,
}: {
  value: number;
  max: number;
  className: string;
  hidden: boolean;
}) {
  const height = Math.max(value > 0 ? 8 : 3, Math.round((value / max) * 112));
  return (
    <div
      className={cn("w-2 rounded-full", className, value > 0 ? "" : "opacity-25")}
      style={{ height }}
      title={hidden ? undefined : formatEuroCompact(value)}
    />
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 shrink-0 rounded-full", className)} />
      {label}
    </li>
  );
}

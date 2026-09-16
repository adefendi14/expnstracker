import { formatEuroCompact } from "@/lib/format";
import type { MonthSeries, ResidualPoint } from "@/lib/people";

export function MonthBarsChart({ series }: { series: MonthSeries[] }) {
  const max = Math.max(
    1,
    ...series.flatMap((item) => [item.debiti, item.crediti, item.versamenti, item.spese])
  );

  return (
    <div className="rounded-3xl bg-card p-4 ring-1 ring-foreground/8">
      <p className="text-sm font-medium">Ultimi mesi</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Debiti, crediti, versamenti e spese collegate.</p>
      <div className="mt-4 flex items-end gap-2">
        {series.map((item) => (
          <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex h-28 w-full items-end justify-center gap-0.5">
              <Bar value={item.debiti} max={max} className="bg-rose-400" />
              <Bar value={item.crediti} max={max} className="bg-emerald-500" />
              <Bar value={item.versamenti} max={max} className="bg-sky-500" />
              <Bar value={item.spese} max={max} className="bg-amber-400" />
            </div>
            <p className="text-[10px] font-medium capitalize text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <LegendDot className="bg-rose-400" label="Debiti" />
        <LegendDot className="bg-emerald-500" label="Crediti" />
        <LegendDot className="bg-sky-500" label="Versamenti" />
        <LegendDot className="bg-amber-400" label="Spese" />
      </ul>
    </div>
  );
}

export function ResidualChart({ points }: { points: ResidualPoint[] }) {
  const usable = points.filter((point) => point.at);
  const width = 320;
  const height = 140;
  const pad = 12;
  const max = Math.max(1, ...usable.flatMap((point) => [point.credits, point.debts]));
  const last = usable[usable.length - 1];

  function pathFor(key: "credits" | "debts") {
    if (usable.length === 0) return "";
    return usable
      .map((point, index) => {
        const x = pad + (index / Math.max(1, usable.length - 1)) * (width - pad * 2);
        const y = height - pad - (point[key] / max) * (height - pad * 2);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <div className="rounded-3xl bg-card p-4 ring-1 ring-foreground/8">
      <p className="text-sm font-medium">Andamento del residuo</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Quanto resta aperto nel tempo, dopo i versamenti.</p>
      {usable.length < 2 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Ancora pochi movimenti per una curva. Resta aperto{" "}
          {formatEuroCompact((last?.credits ?? 0) - (last?.debts ?? 0))}.
        </p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-36 w-full" role="img" aria-label="Residuo nel tempo">
          <path d={pathFor("credits")} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
          <path d={pathFor("debts")} fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      <ul className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
        <LegendDot className="bg-emerald-600" label="Ti deve" />
        <LegendDot className="bg-rose-600" label="Devi tu" />
      </ul>
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const height = Math.max(value > 0 ? 6 : 2, Math.round((value / max) * 112));
  return (
    <div
      className={`w-1.5 rounded-full ${className} ${value > 0 ? "" : "opacity-20"}`}
      style={{ height }}
      title={formatEuroCompact(value)}
    />
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </li>
  );
}

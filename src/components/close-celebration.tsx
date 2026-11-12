"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CloseCelebrationKind = "debito" | "credito" | "spesa" | "idea";

type CelebrationPayload = {
  kind: CloseCelebrationKind;
  id: number;
};

type CloseCelebrationContextValue = {
  celebrateClose: (kind: CloseCelebrationKind) => void;
};

const CloseCelebrationContext = createContext<CloseCelebrationContextValue | null>(null);

const LABELS: Record<CloseCelebrationKind, string> = {
  debito: "Debito chiuso",
  credito: "Credito chiuso",
  spesa: "Spesa chiusa",
  idea: "Idea chiusa",
};

const CONFETTI_COLORS = ["#E39E94", "#F2C4BD", "#FFFFFF", "#F7E4E1", "#D4847A", "#FFD6CF"];

function ConfettiBurst({ active }: { active: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => {
        const left = (index * 17 + 8) % 100;
        const delay = (index % 12) * 0.05;
        const duration = 1.6 + (index % 7) * 0.12;
        const size = 6 + (index % 5);
        const rotate = (index * 47) % 360;
        return {
          id: index,
          left,
          delay,
          duration,
          size,
          rotate,
          color: CONFETTI_COLORS[index % CONFETTI_COLORS.length]!,
          shape: index % 3 === 0 ? "circle" : "rect",
        };
      }),
    []
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={cn(
            "absolute top-0 confetti-piece",
            piece.shape === "circle" ? "rounded-full" : "rounded-[2px]"
          )}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.shape === "circle" ? piece.size : piece.size * 0.45,
            background: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ["--confetti-rotate" as string]: `${piece.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}

export function CloseCelebrationProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<CelebrationPayload | null>(null);
  const [visible, setVisible] = useState(false);

  const celebrateClose = useCallback((kind: CloseCelebrationKind) => {
    setPayload({ kind, id: Date.now() });
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!payload) return;
    setVisible(true);
    const hide = window.setTimeout(() => setVisible(false), 2200);
    const clear = window.setTimeout(() => setPayload(null), 2800);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(clear);
    };
  }, [payload]);

  const value = useMemo(() => ({ celebrateClose }), [celebrateClose]);

  return (
    <CloseCelebrationContext.Provider value={value}>
      {children}
      {payload ? (
        <div
          className={cn(
            "pointer-events-none fixed inset-0 z-[100] flex items-center justify-center px-6 transition-opacity duration-500",
            visible ? "opacity-100" : "opacity-0"
          )}
          aria-live="polite"
        >
          <ConfettiBurst active={visible} />
          <div
            key={payload.id}
            className={cn(
              "relative flex flex-col items-center gap-4 rounded-[1.75rem] bg-card/90 px-8 py-7 text-center shadow-xl ring-1 ring-foreground/10 backdrop-blur-xl",
              "celebration-card"
            )}
          >
            <div className="celebration-check flex size-20 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-[0_10px_30px_rgba(227,158,148,0.45)]">
              <Check className="size-9 stroke-[2.75]" />
            </div>
            <p className="celebration-label text-lg font-semibold tracking-tight text-foreground">
              {LABELS[payload.kind]}
            </p>
          </div>
        </div>
      ) : null}
    </CloseCelebrationContext.Provider>
  );
}

export function useCloseCelebration() {
  const context = useContext(CloseCelebrationContext);
  if (!context) {
    throw new Error("useCloseCelebration deve essere usato dentro CloseCelebrationProvider");
  }
  return context;
}

"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { isLedgerPayment, ledgerTitleKey } from "@/lib/format";
import type { LedgerEntry, PersonProfile } from "@/lib/types";

const inputClass = "h-12 rounded-2xl px-3.5";

type Suggestion =
  | { kind: "ledger"; id: string; title: string; meta: string }
  | { kind: "person"; id: string; title: string; meta: string };

export function AssociationPicker({
  value,
  selectedId,
  onChange,
  ledger,
  people,
  excludeId,
}: {
  value: string;
  selectedId?: string;
  onChange: (next: { query: string; associatedLedgerId?: string }) => void;
  ledger: LedgerEntry[];
  people: PersonProfile[];
  excludeId?: string;
}) {
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const key = ledgerTitleKey(value);
    const principals = ledger.filter(
      (item) => !isLedgerPayment(item) && item.id !== excludeId
    );
    const fromLedger: Suggestion[] = principals.map((item) => ({
      kind: "ledger",
      id: item.id,
      title: item.title,
      meta: `${item.direction === "debito" ? "Debito" : "Credito"} · ${item.person}`,
    }));
    const fromPeople: Suggestion[] = people.map((person) => ({
      kind: "person",
      id: `person:${person.id}`,
      title: person.name,
      meta: "Persona",
    }));

    const merged = [...fromLedger, ...fromPeople];
    if (!key) return merged.slice(0, 10);
    return merged
      .filter(
        (item) =>
          ledgerTitleKey(item.title).includes(key) || ledgerTitleKey(item.meta).includes(key)
      )
      .slice(0, 10);
  }, [ledger, people, value, excludeId]);

  const selected = ledger.find((item) => item.id === selectedId);

  return (
    <div className="relative">
      <Input
        value={selected ? selected.title : value}
        autoComplete="off"
        spellCheck={false}
        placeholder="Cerca titolo o persona da associare…"
        className={inputClass}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 180);
        }}
        onChange={(event) => {
          onChange({ query: event.target.value, associatedLedgerId: undefined });
          setOpen(true);
        }}
      />
      {selected ? (
        <button
          type="button"
          className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange({ query: "", associatedLedgerId: undefined })}
        >
          Rimuovi associazione · {selected.title}
        </button>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-2xl bg-card py-1 shadow-lg ring-1 ring-foreground/10">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex min-h-11 w-full flex-col items-start justify-center px-3.5 py-2 text-left"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (item.kind === "ledger") {
                    onChange({ query: item.title, associatedLedgerId: item.id });
                  } else {
                    onChange({ query: item.title, associatedLedgerId: undefined });
                  }
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-[11px] text-muted-foreground">{item.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { normalizePersonKey } from "@/lib/people";
import type { PersonProfile } from "@/lib/types";

const inputClass = "h-12 rounded-2xl px-3.5";

export function PersonPicker({
  id,
  name,
  value,
  onChange,
  people,
  placeholder = "Marco, inquilino, banca…",
  optional = false,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  people: PersonProfile[];
  placeholder?: string;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const key = normalizePersonKey(value);
    const list = [...people].sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
    if (!key) return list.slice(0, 8);
    return list.filter((person) => normalizePersonKey(person.name).includes(key)).slice(0, 8);
  }, [people, value]);

  const exact = people.some((person) => normalizePersonKey(person.name) === normalizePersonKey(value));
  const showCreate = Boolean(value.trim()) && !exact;

  return (
    <div className="relative">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Input
        id={id}
        value={value}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        placeholder={placeholder}
        className={inputClass}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 180);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
      />
      {open && (filtered.length > 0 || showCreate) ? (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-2xl bg-card py-1 shadow-lg ring-1 ring-foreground/10">
          {filtered.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center px-3.5 text-left text-sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(person.name);
                  setOpen(false);
                }}
              >
                {person.name}
              </button>
            </li>
          ))}
          {showCreate ? (
            <li>
              <button
                type="button"
                className="flex min-h-11 w-full items-center px-3.5 text-left text-sm text-muted-foreground"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setOpen(false)}
              >
                {optional ? "Collega a" : "Nuovo profilo"} «{value.trim()}»
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

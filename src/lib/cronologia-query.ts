import type { ListKind, StatusFilter } from "@/lib/types";

export function parseCronologiaQuery(searchParams: {
  get: (key: string) => string | null;
}): {
  kind: ListKind;
  status: StatusFilter;
} {
  const tipo = searchParams.get("tipo");
  const stato = searchParams.get("stato");
  return {
    kind:
      tipo === "debiti" || tipo === "crediti" || tipo === "spese" || tipo === "idee"
        ? tipo
        : "tutti",
    status: stato === "aperti" || stato === "chiusi" || stato === "tutti" ? stato : "tutti",
  };
}

export function cronologiaHref(kind: ListKind, status: StatusFilter) {
  const params = new URLSearchParams();
  if (kind !== "tutti") params.set("tipo", kind);
  if (status !== "tutti") params.set("stato", status);
  const qs = params.toString();
  return qs ? `/cronologia/?${qs}` : "/cronologia/";
}

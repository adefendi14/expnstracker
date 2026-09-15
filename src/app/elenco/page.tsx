import { ListsGate } from "@/components/lists-gate";
import type { ListKind } from "@/lib/types";

export default async function ElencoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const params = await searchParams;
  const tipo = params.tipo;
  const initialKind: ListKind =
    tipo === "debiti" || tipo === "crediti" || tipo === "spese" || tipo === "idee" ? tipo : "tutti";
  return <ListsGate initialKind={initialKind} />;
}

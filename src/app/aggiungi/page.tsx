import { AddScreen } from "@/components/add-screen";

export default async function AggiungiPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; id?: string }>;
}) {
  const params = await searchParams;
  return <AddScreen tipo={params.tipo} id={params.id} />;
}

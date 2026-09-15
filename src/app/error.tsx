"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-destructive">Errore</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Qualcosa è andato storto</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Non siamo riusciti a caricare questa schermata. Puoi riprovare subito: i dati sul dispositivo non
        vengono toccati.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-muted-foreground">Codice: {error.digest}</p> : null}
      <Button className="mt-6 h-12 rounded-2xl px-6" onClick={reset}>
        Riprova
      </Button>
    </div>
  );
}

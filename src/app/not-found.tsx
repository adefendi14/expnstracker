import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Pagina non trovata</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Questa schermata non esiste. Torna al riepilogo per continuare.
      </p>
      <Button nativeButton={false} render={<Link href="/" />} className="mt-6 h-12 rounded-2xl px-6">
        Vai al riepilogo
      </Button>
    </div>
  );
}

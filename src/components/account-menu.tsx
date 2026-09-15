"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { LogOut, Download, Upload } from "lucide-react";
import { useStore } from "@/lib/store";

export function AccountMenu() {
  const { user, logout, exportDatabase, importDatabase } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      await importDatabase(file);
      toast.success("Database importato.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Importazione non riuscita.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".sqlite,.db,application/vnd.sqlite3"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void onImport(file);
        }}
      />
      <button
        type="button"
        className="flex h-10 items-center gap-2 rounded-xl px-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => {
          exportDatabase();
          toast.success("File SQLite scaricato.");
        }}
      >
        <Download className="size-4" />
        Esporta file
      </button>
      <button
        type="button"
        className="flex h-10 items-center gap-2 rounded-xl px-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-4" />
        Importa file
      </button>
      <button
        type="button"
        className="flex h-10 items-center gap-2 rounded-xl px-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={logout}
      >
        <LogOut className="size-4" />
        Esci
      </button>
    </div>
  );
}

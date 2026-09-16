"use client";

import type { ChangeEvent, RefObject } from "react";
import { IMPORT_DATABASE_ACCEPT } from "@/lib/import-file";

type SqliteFileInputProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  onFile: (file: File | undefined) => void;
};

export function SqliteFileInput({ inputRef, disabled, onFile }: SqliteFileInputProps) {
  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    onFile(file);
  }

  return (
    <input
      ref={inputRef}
      type="file"
      accept={IMPORT_DATABASE_ACCEPT}
      disabled={disabled}
      className="hidden"
      onChange={onChange}
    />
  );
}

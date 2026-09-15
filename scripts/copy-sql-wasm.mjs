import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
copyFileSync(
  join(root, "node_modules/sql.js/dist/sql-wasm.wasm"),
  join(root, "public/sql-wasm.wasm")
);

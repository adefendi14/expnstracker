import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function resolveSha() {
  if (process.env.DEPLOY_SHA && process.env.DEPLOY_SHA.trim()) {
    return process.env.DEPLOY_SHA.trim();
  }
  const stamped = join(root, "DEPLOY_SHA.txt");
  if (existsSync(stamped)) {
    try {
      const value = readFileSync(stamped, "utf8").trim();
      if (value) return value;
    } catch {
      /* ignore */
    }
  }
  try {
    return execSync("git rev-parse HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

const sha = resolveSha();
const mark = `expnstracker-deploy ${sha}\n`;

for (const dir of [join(root, "public"), join(root, "out")]) {
  if (!existsSync(dir)) {
    if (dir.endsWith("public")) mkdirSync(dir, { recursive: true });
    else continue;
  }
  writeFileSync(join(dir, "DEPLOY_SHA.txt"), `${sha}\n`);
  writeFileSync(join(dir, "BUILD_MARK.txt"), mark);
}

console.log(`Stamped DEPLOY_SHA=${sha}`);

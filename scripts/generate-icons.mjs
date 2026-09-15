import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function iconSvg(size) {
  const r = Math.round(size * 0.22);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${r}" fill="#EDEAE3"/>
  <g fill="none" stroke="#2C2C2A" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="256" cy="286" rx="148" ry="112"/>
    <path d="M178 176c18-38 46-58 78-58"/>
    <path d="M392 268c28 4 52 22 62 48"/>
    <path d="M150 392v28"/>
    <path d="M220 404v28"/>
    <path d="M292 404v28"/>
    <path d="M362 392v28"/>
    <path d="M228 214h56"/>
  </g>
  <circle cx="368" cy="168" r="46" fill="#2C2C2A"/>
  <path d="M356 168h24M348 156c10-12 28-12 38 0M348 180c10 12 28 12 38 0" stroke="#EDEAE3" stroke-width="8" stroke-linecap="round" fill="none"/>
</svg>`;
}

async function writePng(file, size) {
  const buf = await sharp(Buffer.from(iconSvg(size)))
    .resize(size, size)
    .png()
    .toBuffer();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
}

await writePng(join(root, "public/icon-192.png"), 192);
await writePng(join(root, "public/icon-512.png"), 512);
await writePng(join(root, "public/apple-touch-icon.png"), 180);
await writePng(join(root, "src/app/icon.png"), 192);
await writePng(join(root, "src/app/apple-icon.png"), 180);

console.log("Icons written");

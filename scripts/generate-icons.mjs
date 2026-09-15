import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BACKGROUND = "#F4F3EF";
const PIGGY = "#1A1A1A";

const lucidePiggy = `
  <path d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"/>
  <path d="M16 10h.01"/>
  <path d="M2 8v1a2 2 0 0 0 2 2h1"/>
`;

function iconSvg(size, paddingRatio = 0.18) {
  const radius = Math.round(size * 0.22);
  const pad = size * paddingRatio;
  const scale = (size - pad * 2) / 24;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BACKGROUND}"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})" fill="none" stroke="${PIGGY}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${lucidePiggy}
  </g>
</svg>`;
}

function pngToIco(png, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

async function writePng(file, size, paddingRatio) {
  const buf = await sharp(Buffer.from(iconSvg(size, paddingRatio)))
    .resize(size, size)
    .png()
    .toBuffer();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
  return buf;
}

const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${PIGGY}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect width="24" height="24" rx="5.2" fill="${BACKGROUND}" stroke="none"/>
  <g transform="translate(2.2 2.2) scale(0.816)">
    ${lucidePiggy}
  </g>
</svg>
`;

await writePng(join(root, "public/icon-192.png"), 192);
await writePng(join(root, "public/icon-512.png"), 512);
await writePng(join(root, "public/apple-touch-icon.png"), 180);
await writePng(join(root, "src/app/icon.png"), 192);
await writePng(join(root, "src/app/apple-icon.png"), 180);
writeFileSync(join(root, "public/favicon.svg"), faviconSvg);

const faviconPng = await writePng(join(root, "public/favicon-32.png"), 32, 0.12);
writeFileSync(join(root, "src/app/favicon.ico"), pngToIco(faviconPng, 32, 32));

console.log("Icons written");

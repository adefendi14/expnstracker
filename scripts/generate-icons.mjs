import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BG = "#F4F3EF";
const PIG = "#E39E94";
const PIG_DEEP = "#D48C84";
const SNOUT = "#EBC4BA";
const INNER = "#CE7F77";
const FEATURE = "#C5756D";
const SHADOW = "#E4DCD3";

/** Ceramic salvadanaio, side view, facing left. viewBox 0 0 512 512. */
function piggyArtwork() {
  return `
    <ellipse cx="256" cy="392" rx="118" ry="12" fill="${SHADOW}"/>
    <path d="M392 246a24 24 0 1 1 0 42" fill="none" stroke="${PIG}" stroke-width="18" stroke-linecap="round"/>
    <rect x="150" y="318" width="40" height="68" rx="20" fill="${PIG_DEEP}"/>
    <rect x="204" y="330" width="38" height="58" rx="19" fill="${PIG_DEEP}"/>
    <rect x="266" y="318" width="40" height="68" rx="20" fill="${PIG}"/>
    <rect x="322" y="330" width="38" height="58" rx="19" fill="${PIG}"/>
    <ellipse cx="262" cy="250" rx="136" ry="114" fill="${PIG}"/>
    <ellipse cx="198" cy="154" rx="24" ry="38" transform="rotate(-30 198 154)" fill="${INNER}"/>
    <ellipse cx="170" cy="146" rx="28" ry="42" transform="rotate(-36 170 146)" fill="${PIG}"/>
    <ellipse cx="168" cy="150" rx="11" ry="20" transform="rotate(-36 168 150)" fill="${SNOUT}"/>
    <ellipse cx="126" cy="262" rx="38" ry="34" fill="${SNOUT}"/>
    <ellipse cx="114" cy="262" rx="6.5" ry="8.5" fill="${FEATURE}"/>
    <ellipse cx="136" cy="262" rx="6.5" ry="8.5" fill="${FEATURE}"/>
    <ellipse cx="172" cy="222" rx="8" ry="10" fill="${FEATURE}"/>
    <rect x="246" y="142" width="72" height="22" rx="11" fill="${FEATURE}"/>
  `;
}

function iconSvg(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  ${piggyArtwork()}
</svg>`;
}

function logoSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  ${piggyArtwork()}
</svg>`;
}

function faviconSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="114" fill="${BG}"/>
  ${piggyArtwork()}
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

async function writePng(file, size) {
  const buf = await sharp(Buffer.from(iconSvg(size)))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
  return buf;
}

writeFileSync(join(root, "public/logo.svg"), logoSvg());
writeFileSync(join(root, "public/favicon.svg"), faviconSvg());

await writePng(join(root, "public/icon-192.png"), 192);
await writePng(join(root, "public/icon-512.png"), 512);
await writePng(join(root, "public/apple-touch-icon.png"), 180);
await writePng(join(root, "src/app/icon.png"), 192);
await writePng(join(root, "src/app/apple-icon.png"), 180);

const faviconPng = await writePng(join(root, "public/favicon-32.png"), 32);
writeFileSync(join(root, "src/app/favicon.ico"), pngToIco(faviconPng, 32, 32));

console.log("Icons written");

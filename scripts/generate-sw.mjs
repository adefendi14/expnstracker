import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out");

const SHELL = [
  "./",
  "./index.html",
  "./elenco/",
  "./elenco/index.html",
  "./salvadanai/",
  "./salvadanai/index.html",
  "./aggiungi/",
  "./aggiungi/index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./sql-wasm.wasm",
  "./logo.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon.svg",
  "./favicon-32.png",
];

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    if (name === "." || name === "..") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function urlsFromOut() {
  const urls = new Set(SHELL);
  if (!existsSync(join(outDir, "index.html"))) {
    return [...urls];
  }
  for (const file of walk(outDir)) {
    const rel = relative(outDir, file).split("\\").join("/");
    if (!rel || rel === "sw.js" || rel === ".nojekyll") continue;
    if (rel.endsWith(".map") || rel.endsWith(".DS_Store")) continue;
    urls.add(`./${rel}`);
    if (rel === "index.html") {
      urls.add("./");
    } else if (rel.endsWith("/index.html")) {
      urls.add(`./${rel.slice(0, -"index.html".length)}`);
    }
  }
  return [...urls].sort();
}

function renderServiceWorker(version, precache) {
  const list = precache.map((url) => `  ${JSON.stringify(url)}`).join(",\n");
  return `/* ExpnsTracker app-shell cache. Generated: ${version} */
const CACHE_NAME = ${JSON.stringify(`expnstracker-shell-${version}`)};
const OFFLINE_URL = "./offline.html";
const PRECACHE = [
${list}
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const request = new Request(url, { cache: "reload", credentials: "same-origin" });
            const response = await fetch(request);
            if (response.ok) await cache.put(request, response);
          } catch {
            /* skip missing files so install still completes */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("expnstracker-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/sw.js")) return;
  event.respondWith(handleRequest(request));
});

function isPageRequest(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

async function cached(request) {
  const exact = await caches.match(request);
  if (exact) return exact;
  return caches.match(request, { ignoreSearch: true });
}

async function store(request, response) {
  if (!response || !response.ok || response.type === "opaque" || response.status === 206) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  const url = new URL(request.url);
  if (url.search) {
    await cache.put(url.origin + url.pathname, response.clone());
  }
}

async function offlinePage() {
  return (
    (await caches.match(new Request(OFFLINE_URL))) ||
    new Response("Sei offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  );
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const hashedAsset =
    url.pathname.includes("/_next/static/") ||
    /\\.(?:js|css|woff2?|png|svg|ico|wasm|webmanifest)$/i.test(url.pathname);

  if (hashedAsset) {
    const hit = await cached(request);
    if (hit) return hit;
    try {
      const response = await fetch(request);
      await store(request, response);
      return response;
    } catch {
      return new Response("", { status: 503, statusText: "Offline" });
    }
  }

  try {
    const response = await fetch(request);
    await store(request, response);
    return response;
  } catch {
    const hit = await cached(request);
    if (hit) return hit;
    if (url.pathname.endsWith("/")) {
      const indexHit = await cached(new Request(url.origin + url.pathname + "index.html"));
      if (indexHit) return indexHit;
    }
    if (isPageRequest(request)) return offlinePage();
    return new Response("", { status: 503, statusText: "Offline" });
  }
}
`;
}

const urls = urlsFromOut();
const version = createHash("sha256").update(urls.join("\n")).digest("hex").slice(0, 12);
const source = renderServiceWorker(version, urls);
const dest = existsSync(join(outDir, "index.html")) ? join(outDir, "sw.js") : join(root, "public/sw.js");
writeFileSync(dest, source);
console.log(`Service worker written to ${relative(root, dest)} (${urls.length} urls, ${version})`);

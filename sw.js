/* ExpnsTracker app-shell cache. Generated: 74d19f5a3747 */
const CACHE_NAME = "expnstracker-shell-74d19f5a3747";
const OFFLINE_URL = "./offline.html";
const PRECACHE = [
  "./",
  "./404.html",
  "./404/",
  "./404/index.html",
  "./__next.__PAGE__.txt",
  "./__next._full.txt",
  "./__next._tree.txt",
  "./_next/static/8_lpfNZet8V1hx-H6Ultz/_buildManifest.js",
  "./_next/static/8_lpfNZet8V1hx-H6Ultz/_clientMiddlewareManifest.js",
  "./_next/static/8_lpfNZet8V1hx-H6Ultz/_ssgManifest.js",
  "./_next/static/chunks/011ku-y_mf3r9.js",
  "./_next/static/chunks/0cz1d0mv5g_q7.js",
  "./_next/static/chunks/0dauets79x7zw.js",
  "./_next/static/chunks/0lskx0th515rx.js",
  "./_next/static/chunks/0yrn-4294x9cd.js",
  "./_next/static/chunks/1npnvr8pzs7k-.css",
  "./_next/static/chunks/1u8_lge44khzh.js",
  "./_next/static/chunks/28w9dcstardro.js",
  "./_next/static/chunks/2d-1hfkv2hgbw.js",
  "./_next/static/chunks/2i51e627rllld.js",
  "./_next/static/chunks/2n4_yuge5nzdu.js",
  "./_next/static/chunks/36bf9x9bm7-ly.js",
  "./_next/static/chunks/36dmmuewvdowz.js",
  "./_next/static/chunks/3a_6u49b0tw3t.js",
  "./_next/static/chunks/3fntmmi971322.js",
  "./_next/static/chunks/3fzywpovbm5ps.js",
  "./_next/static/chunks/3r9yxox5g66wm.js",
  "./_next/static/chunks/3s8bulif8b6p1.js",
  "./_next/static/chunks/3xb78yx7symy5.js",
  "./_next/static/chunks/turbopack-13cikesthjkba.js",
  "./_next/static/media/1b99372b3eaef0c8-s.p.1gsd1jahc5dg_.woff2",
  "./_next/static/media/apple-icon.3qs50o59-epg-.png",
  "./_next/static/media/b2ea385cb5ae8625-s.1spbknb88wd48.woff2",
  "./_next/static/media/favicon.1g92_1p9j5-pp.ico",
  "./_next/static/media/icon.1nzoxem9yc_1j.png",
  "./_not-found/",
  "./_not-found/__next._full.txt",
  "./_not-found/__next._not-found.__PAGE__.txt",
  "./_not-found/__next._tree.txt",
  "./_not-found/index.html",
  "./_not-found/index.txt",
  "./aggiungi/",
  "./aggiungi/__next._full.txt",
  "./aggiungi/__next._tree.txt",
  "./aggiungi/__next.aggiungi.__PAGE__.txt",
  "./aggiungi/index.html",
  "./aggiungi/index.txt",
  "./apple-icon.png",
  "./apple-touch-icon.png",
  "./elenco/",
  "./elenco/__next._full.txt",
  "./elenco/__next._tree.txt",
  "./elenco/__next.elenco.__PAGE__.txt",
  "./elenco/index.html",
  "./elenco/index.txt",
  "./favicon-32.png",
  "./favicon.ico",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon.png",
  "./index.html",
  "./index.txt",
  "./logo.svg",
  "./manifest.webmanifest",
  "./offline.html",
  "./salvadanai/",
  "./salvadanai/__next._full.txt",
  "./salvadanai/__next._tree.txt",
  "./salvadanai/__next.salvadanai.__PAGE__.txt",
  "./salvadanai/index.html",
  "./salvadanai/index.txt",
  "./sql-wasm.wasm"
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
    /\.(?:js|css|woff2?|png|svg|ico|wasm|webmanifest)$/i.test(url.pathname);

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

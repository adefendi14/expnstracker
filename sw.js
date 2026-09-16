/* ExpnsTracker app-shell cache. Generated: 7be8ef48b265 */
const CACHE_NAME = "expnstracker-shell-7be8ef48b265";
const OFFLINE_URL = "./offline.html";
const PRECACHE = [
  "./",
  "./404.html",
  "./404/",
  "./404/index.html",
  "./__next.__PAGE__.txt",
  "./__next._full.txt",
  "./__next._tree.txt",
  "./_next/static/CPbFH_XMsT9vgBc7aantQ/_buildManifest.js",
  "./_next/static/CPbFH_XMsT9vgBc7aantQ/_clientMiddlewareManifest.js",
  "./_next/static/CPbFH_XMsT9vgBc7aantQ/_ssgManifest.js",
  "./_next/static/chunks/0cz1d0mv5g_q7.js",
  "./_next/static/chunks/0yrn-4294x9cd.js",
  "./_next/static/chunks/10p4mrp-0prb7.js",
  "./_next/static/chunks/15mw3pj1nhdgq.js",
  "./_next/static/chunks/15qiav8hhf885.js",
  "./_next/static/chunks/16pi1xwai0nfq.css",
  "./_next/static/chunks/1cgxxm6qth2hk.js",
  "./_next/static/chunks/1h4x6s-x0lnn7.js",
  "./_next/static/chunks/1lul6wkt8xoun.js",
  "./_next/static/chunks/1wq4vuq50b79p.js",
  "./_next/static/chunks/28w9dcstardro.js",
  "./_next/static/chunks/2i51e627rllld.js",
  "./_next/static/chunks/2n4_yuge5nzdu.js",
  "./_next/static/chunks/36bf9x9bm7-ly.js",
  "./_next/static/chunks/377p1j1u0kss7.js",
  "./_next/static/chunks/3a_6u49b0tw3t.js",
  "./_next/static/chunks/3fntmmi971322.js",
  "./_next/static/chunks/3hz9hhc0_kv6f.js",
  "./_next/static/chunks/3pgtssclusd5n.js",
  "./_next/static/chunks/3pjg39pr0r7pt.js",
  "./_next/static/chunks/3r9yxox5g66wm.js",
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
  "./persone/",
  "./persone/__next._full.txt",
  "./persone/__next._tree.txt",
  "./persone/__next.persone.__PAGE__.txt",
  "./persone/index.html",
  "./persone/index.txt",
  "./persone/scheda/",
  "./persone/scheda/__next._full.txt",
  "./persone/scheda/__next._tree.txt",
  "./persone/scheda/__next.persone.scheda.__PAGE__.txt",
  "./persone/scheda/index.html",
  "./persone/scheda/index.txt",
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
      const cache = await caches.open(CACHE_NAME);
      const stored = await cache.keys();
      const hasShell = stored.some((req) => {
        const path = new URL(req.url).pathname;
        return path.endsWith("/") || path.endsWith("/index.html");
      });
      if (hasShell) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("expnstracker-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      }
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
  if (request.destination === "document") return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

async function lookup(request) {
  const url = new URL(request.url);
  const base = url.origin + url.pathname.replace(/\/+$/, "") ;
  const candidates = [
    request,
    url.origin + url.pathname,
    url.origin + url.pathname + "index.html",
    base + "/",
    base + "/index.html",
  ];
  if (!url.pathname.endsWith("/")) {
    candidates.push(url.origin + url.pathname + "/");
    candidates.push(url.origin + url.pathname + "/index.html");
  }
  for (const candidate of candidates) {
    const hit = await caches.match(candidate, { ignoreSearch: true });
    if (hit) return hit;
  }
  return undefined;
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
  const hit = await lookup(request);
  if (hit) return hit;

  try {
    const response = await fetch(request);
    await store(request, response);
    return response;
  } catch {
    if (isPageRequest(request)) return offlinePage();
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

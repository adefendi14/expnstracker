/* ExpnsTracker app-shell cache. Generated: 85c32fd2d8c0 */
const CACHE_NAME = "expnstracker-shell-85c32fd2d8c0";
const OFFLINE_URL = "./offline.html";
const PRECACHE = [
  "./",
  "./404.html",
  "./404/",
  "./404/index.html",
  "./__next.__PAGE__.txt",
  "./__next._full.txt",
  "./__next._tree.txt",
  "./_next/static/Z2evDCUMQ2RcuGu94l34I/_buildManifest.js",
  "./_next/static/Z2evDCUMQ2RcuGu94l34I/_clientMiddlewareManifest.js",
  "./_next/static/Z2evDCUMQ2RcuGu94l34I/_ssgManifest.js",
  "./_next/static/chunks/09jeq4l1ap6np.js",
  "./_next/static/chunks/0cz1d0mv5g_q7.js",
  "./_next/static/chunks/0dmugq4pyfyhs.js",
  "./_next/static/chunks/0n2uf0t-orzex.js",
  "./_next/static/chunks/0stuztam7mp6-.js",
  "./_next/static/chunks/0xzyk3_21r1wo.js",
  "./_next/static/chunks/0ybn0u0fth9ao.js",
  "./_next/static/chunks/0yrn-4294x9cd.js",
  "./_next/static/chunks/1do8kcbi-j7sh.js",
  "./_next/static/chunks/1fzcvtb-n5gu_.js",
  "./_next/static/chunks/1k_ozz9fc-vj3.css",
  "./_next/static/chunks/1lul6wkt8xoun.js",
  "./_next/static/chunks/21zchlj292zr4.js",
  "./_next/static/chunks/23vlemge9xg4g.js",
  "./_next/static/chunks/28w9dcstardro.js",
  "./_next/static/chunks/2adi_soycf-dv.js",
  "./_next/static/chunks/2akj94hd__nc1.js",
  "./_next/static/chunks/2ft35q_la2wnn.js",
  "./_next/static/chunks/2i51e627rllld.js",
  "./_next/static/chunks/2n4_yuge5nzdu.js",
  "./_next/static/chunks/2tfanji3ih7vz.js",
  "./_next/static/chunks/36bf9x9bm7-ly.js",
  "./_next/static/chunks/3adf5eg7p3fr6.js",
  "./_next/static/chunks/3fntmmi971322.js",
  "./_next/static/chunks/3kjfmt3rlkcp6.js",
  "./_next/static/chunks/41l6xr7r38wkm.js",
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
  "./cronologia/",
  "./cronologia/__next._full.txt",
  "./cronologia/__next._tree.txt",
  "./cronologia/__next.cronologia.__PAGE__.txt",
  "./cronologia/index.html",
  "./cronologia/index.txt",
  "./cronologia/movimento/",
  "./cronologia/movimento/__next._full.txt",
  "./cronologia/movimento/__next._tree.txt",
  "./cronologia/movimento/__next.cronologia.movimento.__PAGE__.txt",
  "./cronologia/movimento/index.html",
  "./cronologia/movimento/index.txt",
  "./favicon-32.png",
  "./favicon.ico",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon.png",
  "./index.html",
  "./index.txt",
  "./logo-plain.svg",
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
  "./seed/expnstracker-test.sqlite",
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

/** Soft navigations + hashed bundles must not be served stale from cache-first. */
function preferNetwork(request) {
  if (isPageRequest(request)) return true;
  const path = new URL(request.url).pathname;
  if (path.includes("/_next/")) return true;
  if (path.includes("/__next")) return true;
  if (path.endsWith(".txt")) return true;
  if (path.endsWith(".js") || path.endsWith(".css")) return true;
  return false;
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
  if (preferNetwork(request)) {
    try {
      const response = await fetch(request);
      await store(request, response);
      return response;
    } catch {
      const hit = await lookup(request);
      if (hit) return hit;
      if (isPageRequest(request)) return offlinePage();
      return new Response("", { status: 503, statusText: "Offline" });
    }
  }

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

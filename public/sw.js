/* Relay service worker — app shell offline + cache aset (RLY-401). */
const VERSION = "relay-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll([OFFLINE_URL])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Aset build & ikon: cache-first
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/pwa-icon") || url.pathname.startsWith("/demo/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); return res; })),
    );
    return;
  }

  // Foto bukti: cache-first (sudah immutable)
  if (url.pathname.startsWith("/api/files/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); } return res; })));
    return;
  }

  // Navigasi halaman: network-first → cache → halaman offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match(OFFLINE_URL))),
    );
  }
});

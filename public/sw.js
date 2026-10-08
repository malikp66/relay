/* Relay service worker — app shell offline + cache aset (RLY-401) + Web Push. */
const VERSION = "relay-v4"; // v4: ikon baru (relay-icon)
// Dev (/sw.js?dev=1): hanya push — tanpa cache supaya CSS/JS dev tidak basi.
const DEV = new URL(self.location.href).searchParams.has("dev");
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  if (DEV) return self.skipWaiting();
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll([OFFLINE_URL])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (DEV) return;
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Aset build (nama ber-hash, immutable) & ikon: cache-first
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

/* ───────────── Web Push ───────────── */

const ICON = "/pwa-icon/192.png";
const BADGE = "/pwa-icon/96-badge.png";
const URGENT = ["overdue", "revision_requested", "task_assigned"];

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Relay", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    (async () => {
      if (typeof data.unread === "number" && self.navigator.setAppBadge) self.navigator.setAppBadge(data.unread).catch(() => {});
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const focused = clients.find((c) => c.focused && c.visibilityState === "visible");
      // App sedang dibuka & fokus → biarkan app yang menampilkan toast + suara (tanpa notifikasi sistem ganda)
      if (focused) {
        focused.postMessage({ type: "relay-push", payload: data });
        return;
      }
      clients.forEach((c) => c.postMessage({ type: "relay-push", payload: data }));
      await self.registration.showNotification(data.title || "Relay", {
        body: data.body || "",
        icon: ICON,
        badge: BADGE,
        tag: data.tag || data.id,
        renotify: true,
        timestamp: data.ts || Date.now(),
        requireInteraction: URGENT.includes(data.kind),
        vibrate: data.kind === "overdue" || data.kind === "revision_requested" ? [120, 60, 120, 60, 200] : [80, 40, 80],
        data: { url: data.url || "/dashboard", id: data.id },
        actions: data.id ? [{ action: "open", title: "Buka" }, { action: "read", title: "Tandai dibaca" }] : [],
      });
    })(),
  );
});

const markRead = (id) =>
  id ? fetch("/api/notifications", { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: [id] }) }).catch(() => {}) : Promise.resolve();

self.addEventListener("notificationclick", (event) => {
  const { url = "/dashboard", id } = event.notification.data || {};
  event.notification.close();
  event.waitUntil(
    (async () => {
      await markRead(id);
      if (event.action === "read") return;
      const target = new URL(url, self.location.origin).href;
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) return existing.navigate(target).catch(() => self.clients.openWindow(target));
        return;
      }
      return self.clients.openWindow(target);
    })(),
  );
});

// Langganan diganti browser (kedaluwarsa) → daftar ulang otomatis
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const key = event.oldSubscription && event.oldSubscription.options.applicationServerKey;
      if (!key) return;
      const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await fetch("/api/push", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
    })(),
  );
});

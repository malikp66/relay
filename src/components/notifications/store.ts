"use client";

import { markNotificationsReadAction } from "@/app/actions/notifications";
import type { NotificationKind } from "@/db/schema";
import { playSfx, type Sfx } from "@/lib/sfx";

/**
 * Store notifikasi di client (useSyncExternalStore).
 * - Polling /api/notifications tiap 20 dtk + saat tab aktif lagi + saat service worker menerima push.
 * - Notifikasi baru → efek suara + toast (callback `onArrive`), badge ikon aplikasi diperbarui.
 * - Web Push: izin, subscribe/unsubscribe perangkat ini.
 */

export type Notif = { id: string; kind: NotificationKind; title: string; body: string; url: string | null; readAt: string | null; createdAt: string };
export type PushState = "loading" | "unsupported" | "ios-install" | "unconfigured" | "denied" | "off" | "on";
type State = { items: Notif[]; unread: number; loaded: boolean; vapidKey: string | null; push: PushState };

let state: State = { items: [], unread: 0, loaded: false, vapidKey: null, push: "loading" };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
export const getState = () => state;
const SERVER: State = { items: [], unread: 0, loaded: false, vapidKey: null, push: "loading" };
export const getServerState = () => SERVER;

export const SFX_FOR: Record<NotificationKind, Sfx> = {
  task_assigned: "chime",
  test: "chime",
  task_approved: "success",
  job_done: "soft",
  task_started: "soft",
  review_started: "soft",
  report_submitted: "chime",
  report_resubmitted: "chime",
  revision_requested: "alert",
  task_cancelled: "alert",
  due_soon: "alert",
  overdue: "alert",
};
const PRIORITY: Sfx[] = ["alert", "success", "chime", "soft"];

let seen = new Set<string>();
let arrive: ((n: Notif[]) => void) | null = null;
let inflight: Promise<void> | null = null;

export function refresh() {
  inflight ??= (async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Notif[]; unread: number; vapidKey: string | null };
      const fresh = state.loaded ? data.items.filter((n) => !seen.has(n.id) && !n.readAt) : [];
      seen = new Set(data.items.map((n) => n.id));
      set({ items: data.items, unread: data.unread, loaded: true, vapidKey: data.vapidKey });
      updateBadge(data.unread);
      if (fresh.length) {
        const sfx = PRIORITY.find((p) => fresh.some((n) => SFX_FOR[n.kind] === p));
        if (sfx) playSfx(sfx);
        arrive?.(fresh);
      }
      if (state.push === "loading" || state.push === "unconfigured") detectPush();
    } catch {
      /* offline — coba lagi di polling berikutnya */
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function updateBadge(n: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (n > 0) nav.setAppBadge?.(n).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  } catch {}
}

let started = false;
/** Mulai polling sekali per tab. `onArrive` dipanggil untuk notifikasi baru (toast). */
export function start(onArrive: (n: Notif[]) => void) {
  arrive = onArrive;
  if (started) return () => {};
  started = true;
  refresh();
  const timer = setInterval(() => document.visibilityState === "visible" && refresh(), 20_000);
  const onVis = () => document.visibilityState === "visible" && refresh();
  const onMsg = (e: MessageEvent) => e.data?.type === "relay-push" && refresh();
  document.addEventListener("visibilitychange", onVis);
  navigator.serviceWorker?.addEventListener("message", onMsg);
  return () => {
    started = false;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVis);
    navigator.serviceWorker?.removeEventListener("message", onMsg);
  };
}

export async function markRead(ids?: string[]) {
  const now = new Date().toISOString();
  const target = ids ? new Set(ids) : null;
  const items = state.items.map((n) => (!n.readAt && (!target || target.has(n.id)) ? { ...n, readAt: now } : n));
  const unread = target ? Math.max(0, state.unread - state.items.filter((n) => !n.readAt && target.has(n.id)).length) : 0;
  set({ items, unread });
  updateBadge(unread);
  await markNotificationsReadAction(ids);
}

/* ───────────── Web Push ───────────── */

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || !!(navigator as unknown as { standalone?: boolean }).standalone;

async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function detectPush() {
  if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
    return set({ push: isIOS() && !standalone() ? "ios-install" : "unsupported" });
  }
  if (!state.loaded) return;
  if (!state.vapidKey) return set({ push: "unconfigured" });
  if (Notification.permission === "denied") return set({ push: "denied" });
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  const on = !!sub && Notification.permission === "granted";
  // perangkat dipakai bergantian (ganti akun) → pastikan langganan milik user yang sedang login
  if (on) fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) }).catch(() => {});
  set({ push: on ? "on" : "off" });
  if (!on) autoEnable();
}

/* Default NYALA: user tidak perlu mencari pengaturan.
 * - izin sudah "granted" → langsung daftarkan perangkat (tanpa dialog)
 * - izin belum ditanya → minta izin pada klik pertama (browser mewajibkan gestur user)
 * - user pernah mematikan sendiri → hormati (tidak dinyalakan lagi) */
const OPT_OUT = "relay-push-optout";
const optedOut = () => {
  try {
    return localStorage.getItem(OPT_OUT) === "1";
  } catch {
    return false;
  }
};
const setOptOut = (v: boolean) => {
  try {
    if (v) localStorage.setItem(OPT_OUT, "1");
    else localStorage.removeItem(OPT_OUT);
  } catch {}
};
let armed = false;
function autoEnable() {
  if (optedOut() || !state.vapidKey) return;
  if (Notification.permission === "granted") return void enablePush();
  if (Notification.permission !== "default" || armed) return;
  armed = true;
  const onFirstClick = () => {
    window.removeEventListener("click", onFirstClick, true);
    if (state.push === "off" && !optedOut()) void enablePush();
  };
  window.addEventListener("click", onFirstClick, true);
}

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Minta izin + daftarkan perangkat ini. Harus dipanggil dari gestur user (klik). */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  setOptOut(false);
  if (!state.vapidKey) return { ok: false, error: "Push belum dikonfigurasi di server (VAPID key)." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    set({ push: perm === "denied" ? "denied" : "off" });
    return { ok: false, error: perm === "denied" ? "Izin notifikasi diblokir. Buka pengaturan situs di browser untuk mengizinkan." : "Izin notifikasi belum diberikan." };
  }
  try {
    // subscribe() butuh service worker yang SUDAH aktif; getRegistration() bisa mengembalikan SW yang masih installing.
    const reg = await activeRegistration();
    if (!reg) return { ok: false, error: "Aplikasi belum siap menerima notifikasi. Muat ulang halaman lalu coba lagi." };
    let sub = await reg.pushManager.getSubscription();
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(state.vapidKey) });
    const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
    if (!res.ok) return { ok: false, error: "Gagal mendaftarkan perangkat." };
    set({ push: "on" });
    return { ok: true };
  } catch {
    set({ push: "off" });
    return { ok: false, error: "Perangkat ini gagal didaftarkan untuk notifikasi. Muat ulang halaman lalu coba lagi." };
  }
}

/** Registrasi dengan SW aktif; tunggu maks. 10 dtk (SW baru dipasang saat halaman pertama dibuka). */
async function activeRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg?.active) return reg;
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 10_000))]);
}

export async function disablePush() {
  setOptOut(true);
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  set({ push: "off" });
}

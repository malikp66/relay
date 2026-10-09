"use client";

import { Download, EllipsisVertical, Share } from "lucide-react";
import { CloseButton, IconTile } from "@/components/relay/icon-button";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { notify } from "@/components/relay/notify";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/lib/brand-icon";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Registrasi service worker + deteksi versi baru (RLY-401, 404). */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Dev: SW production lama (cache-first) menyajikan CSS/JS basi → lepas & bersihkan.
      // Lalu daftarkan SW mode dev (/sw.js?dev=1) yang hanya menangani push, tanpa cache.
      navigator.serviceWorker.getRegistrations().then(async (regs) => {
        const stale = regs.filter((r) => !(r.active ?? r.installing ?? r.waiting)?.scriptURL.includes("dev=1"));
        if (stale.length) {
          await Promise.all(stale.map((r) => r.unregister()));
          const keys = await caches.keys();
          await Promise.all(keys.filter((k) => k.startsWith("relay-")).map((k) => caches.delete(k)));
          if (navigator.serviceWorker.controller && !navigator.serviceWorker.controller.scriptURL.includes("dev=1")) return location.reload();
        }
        navigator.serviceWorker.register("/sw.js?dev=1").catch(() => {});
      });
      return;
    }
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            notify.info("Versi baru Relay tersedia", { description: "Muat ulang untuk memakai versi terbaru.", action: { label: "Muat ulang", onClick: () => location.reload() }, duration: Infinity, id: "sw-update" });
          }
        });
      });
    });
  }, []);
  return null;
}

/* ───────────── Ajakan install (PWA) ─────────────
 * Status: "prompt"  = Chrome/Edge memberi prompt install asli (beforeinstallprompt)
 *         "android" = Android tanpa prompt (mis. Samsung Internet / prompt belum tersedia) → panduan menu ⋮
 *         "ios"     = Safari iPhone/iPad → panduan Share → Tambahkan ke Layar Utama
 *         "hidden"  = sudah terpasang / desktop tanpa prompt
 * Banner di atas halaman bisa ditunda ("Nanti") 3 hari, lalu muncul lagi sampai aplikasi dipasang.
 * Kartu di halaman Akun selalu tampil selama belum terpasang. */
export type InstallState = "prompt" | "android" | "ios" | "hidden";
const SNOOZE_KEY = "relay-install-snooze";
const SNOOZE_MS = 3 * 24 * 3600_000;

let deferred: BIPEvent | null = null;
let installed = false;
let snoozedUntil = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
  try {
    snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY)) || 0;
  } catch {}
}
function installState(): InstallState {
  if (typeof window === "undefined") return "hidden";
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
  if (standalone || installed) return "hidden";
  if (deferred) return "prompt";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "hidden";
}
const subscribeInstall = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const useInstallState = () => useSyncExternalStore(subscribeInstall, installState, () => "hidden" as InstallState);
const snoozed = () => snoozedUntil > Date.now();
const useSnoozed = () => useSyncExternalStore(subscribeInstall, snoozed, () => true);
function snooze() {
  snoozedUntil = Date.now() + SNOOZE_MS;
  try {
    localStorage.setItem(SNOOZE_KEY, String(snoozedUntil));
  } catch {}
  emit();
}
async function promptInstall() {
  const ev = deferred;
  if (!ev) return;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  deferred = null; // prompt hanya bisa dipakai sekali
  if (outcome === "accepted") installed = true;
  else snooze();
  emit();
}

function InstallHint({ state, short }: { state: InstallState; short?: boolean }) {
  if (state === "ios")
    return (
      <>
        Ketuk <Share className="inline size-3.5 -translate-y-px" /> di Safari, lalu pilih “Tambahkan ke Layar Utama”.
      </>
    );
  if (state === "android")
    return (
      <>
        Ketuk <EllipsisVertical className="inline size-3.5 -translate-y-px" /> di browser, lalu pilih “Instal aplikasi” atau “Tambahkan ke layar utama”.
      </>
    );
  return short ? <>Lebih cepat dibuka &amp; dapat notifikasi.</> : <>Buka lebih cepat, tampil penuh, dan notifikasi tugas langsung masuk ke HP.</>;
}

/* Banner hanya di halaman PERTAMA yang dibuka per sesi tab (bukan di setiap halaman yang dikunjungi). */
const SESSION_KEY = "relay-install-banner-page";
function bannerPage(path: string) {
  try {
    const seen = sessionStorage.getItem(SESSION_KEY);
    if (seen) return seen;
    sessionStorage.setItem(SESSION_KEY, path);
  } catch {}
  return path;
}

/** Banner ajakan install di atas konten, muncul saat aplikasi dibuka di browser (belum terpasang). */
export function InstallBanner() {
  const path = usePathname();
  const state = useInstallState();
  const isSnoozed = useSnoozed();
  const [firstPage] = useState(() => (typeof window === "undefined" ? path : bannerPage(path)));
  // Halaman Akun sudah punya kartu install sendiri.
  if (state === "hidden" || isSnoozed || path !== firstPage || path === "/account") return null;
  return (
    <div role="region" aria-label="Pasang aplikasi" className="install-banner mb-5 flex items-center gap-3 rounded-2xl border bg-card py-2.5 pl-2.5 pr-1.5 shadow-[var(--shadow-card)]">
      {/* ikon aplikasi yang akan muncul di layar utama, bukan ikon dekoratif */}
      <BrandMark size={40} className="shrink-0 rounded-[10px]" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold leading-snug">Pasang Relay di HP</p>
        <p className="text-[12.5px] leading-snug text-muted-foreground">
          <InstallHint state={state} short />
        </p>
      </div>
      {state === "prompt" && (
        <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full px-3.5 text-[13px]" onClick={promptInstall}>
          Pasang
        </Button>
      )}
      <CloseButton size="sm" onClick={snooze} label="Tutup, ingatkan 3 hari lagi" />
    </div>
  );
}

/** Kartu install di halaman Akun (selalu tampil selama belum terpasang, tidak bisa ditunda). */
export function InstallCard() {
  const state = useInstallState();
  if (state === "hidden") return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-[var(--shadow-card)]">
      <IconTile icon={Download} color="#2563eb" size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Pasang Relay di HP</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          <InstallHint state={state} />
        </p>
      </div>
      {state === "prompt" && (
        <Button size="sm" className="rounded-xl" onClick={promptInstall}>
          Pasang
        </Button>
      )}
    </div>
  );
}

"use client";

import { Download, Share } from "lucide-react";
import { CloseButton, IconTile } from "@/components/relay/icon-button";
import { useEffect, useSyncExternalStore } from "react";
import { notify } from "@/components/relay/notify";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Registrasi service worker + deteksi versi baru (RLY-401, 404). */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
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

/* Store kecil untuk status install (tanpa setState di effect). */
let deferred: BIPEvent | null = null;
let dismissedFlag = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    emit();
  });
}
function readState() {
  if (typeof window === "undefined") return "hidden";
  let dismissed = dismissedFlag;
  try {
    dismissed ||= localStorage.getItem("relay-install-dismissed") === "1";
  } catch {}
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
  if (standalone || dismissed) return "hidden";
  if (deferred) return "prompt";
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "hidden";
}
const subscribeInstall = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Ajakan install aplikasi (Android: prompt asli; iOS: panduan Share → Add to Home Screen). */
export function InstallCard() {
  const state = useSyncExternalStore(subscribeInstall, readState, () => "hidden");
  if (state === "hidden") return null;
  const dismiss = () => {
    dismissedFlag = true;
    try {
      localStorage.setItem("relay-install-dismissed", "1");
    } catch {}
    emit();
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 pr-2.5 shadow-[var(--shadow-card)]">
      <IconTile icon={Download} color="#2563eb" size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Pasang Relay di HP</p>
        <p className="text-xs text-muted-foreground">
          {state === "ios" ? (
            <>
              Ketuk <Share className="inline size-3.5" /> lalu “Tambahkan ke Layar Utama”.
            </>
          ) : (
            "Buka lebih cepat, tampil penuh seperti aplikasi."
          )}
        </p>
      </div>
      {state === "prompt" && (
        <Button
          size="sm"
          className="rounded-xl"
          onClick={async () => {
            await deferred?.prompt();
            deferred = null;
            dismiss();
          }}
        >
          Pasang
        </Button>
      )}
      <CloseButton size="sm" onClick={dismiss} label="Jangan tampilkan lagi" />
    </div>
  );
}

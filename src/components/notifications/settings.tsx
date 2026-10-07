"use client";

import { Loader2, Play } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { sendTestNotificationAction } from "@/app/actions/notifications";
import { notify } from "@/components/relay/notify";
import { Switch } from "@/components/ui/switch";
import { playSfx, setSfxEnabled, sfxEnabled, subscribeSfx, type Sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { disablePush, enablePush, getServerState, getState, refresh, subscribe, type PushState } from "./store";

const PUSH_COPY: Record<PushState, { hint: string; tone?: "warn" }> = {
  loading: { hint: "Memeriksa perangkat…" },
  on: { hint: "Aktif. Notifikasi muncul di perangkat ini walau Relay ditutup." },
  off: { hint: "Belum aktif di perangkat ini. Pilih Izinkan saat browser bertanya, atau nyalakan di sini." },
  denied: { hint: "Diblokir browser. Izinkan notifikasi lewat ikon gembok di address bar, lalu muat ulang.", tone: "warn" },
  unsupported: { hint: "Browser ini tidak mendukung notifikasi push. Notifikasi tetap tampil di dalam aplikasi.", tone: "warn" },
  "ios-install": { hint: "Di iPhone/iPad: ketuk Bagikan → Tambahkan ke Layar Utama, buka Relay dari sana, lalu aktifkan di sini.", tone: "warn" },
  unconfigured: { hint: "Server belum diatur untuk push (VAPID key). Notifikasi tetap tampil di dalam aplikasi.", tone: "warn" },
};

const SOUNDS: { id: Sfx; label: string }[] = [
  { id: "chime", label: "Task baru" },
  { id: "success", label: "Disetujui" },
  { id: "alert", label: "Revisi / overdue" },
  { id: "soft", label: "Info" },
];

const sfxSnapshot = () => sfxEnabled();

export function NotificationSettings() {
  const st = useSyncExternalStore(subscribe, getState, getServerState);
  const sound = useSyncExternalStore(subscribeSfx, sfxSnapshot, () => true);
  const [busy, setBusy] = useState<"push" | "test" | null>(null);
  const copy = PUSH_COPY[st.push];
  const canToggle = st.push === "on" || st.push === "off";

  return (
    <div id="notifikasi" data-tour="account-notif" className="scroll-mt-20 divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      <div className="px-4 py-3">
        <p className="text-[15px] font-semibold tracking-[-0.01em]">Notifikasi</p>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">Task baru, laporan masuk, revisi, persetujuan, dan pengingat deadline.</p>
      </div>

      <div className="flex items-center gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">Notifikasi perangkat</p>
          <p className={cn("mt-0.5 text-[12.5px] leading-relaxed", copy.tone === "warn" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>{copy.hint}</p>
        </div>
        {busy === "push" ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={st.push === "on"}
            disabled={!canToggle}
            aria-label="Notifikasi perangkat"
            onCheckedChange={async (on) => {
              setBusy("push");
              if (on) {
                const r = await enablePush();
                if (r.ok) notify.success("Notifikasi perangkat aktif");
                else notify.error(r.error ?? "Gagal mengaktifkan");
              } else {
                await disablePush();
                notify.info("Notifikasi perangkat dimatikan");
              }
              setBusy(null);
            }}
          />
        )}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">Suara</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">Bunyi saat notifikasi masuk ketika Relay terbuka.</p>
          </div>
          <Switch checked={sound} aria-label="Suara notifikasi" onCheckedChange={(on) => setSfxEnabled(on)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SOUNDS.map((s) => (
            <button key={s.id} type="button" onClick={() => playSfx(s.id, true)} className="chip h-8 gap-1.5 px-2.5 text-[12px]">
              <Play className="size-3 fill-current opacity-60" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">Kirim notifikasi uji</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">Cek apakah notifikasi sampai ke perangkat ini.</p>
        </div>
        <button
          type="button"
          disabled={busy === "test"}
          onClick={async () => {
            setBusy("test");
            try {
              const r = await sendTestNotificationAction();
              await refresh();
              if (!r.push) notify.info("Terkirim ke lonceng", { description: "Push perangkat belum dikonfigurasi di server." });
            } catch {
              notify.error("Gagal mengirim notifikasi uji");
            } finally {
              setBusy(null);
            }
          }}
          className="press flex h-9 shrink-0 items-center gap-1.5 rounded-xl border bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-foreground/[0.04] disabled:opacity-50"
        >
          {busy === "test" && <Loader2 className="size-3.5 animate-spin" />}
          Kirim
        </button>
      </div>
    </div>
  );
}

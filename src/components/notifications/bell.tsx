"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  MapPin,
  RotateCcw,
  Settings2,
  Volume2,
  VolumeX,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { NotificationKind } from "@/db/schema";
import { IconButton, IconTile } from "@/components/relay/icon-button";
import { notify } from "@/components/relay/notify";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { setSfxEnabled, sfxEnabled, subscribeSfx, unlockSfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { enablePush, getServerState, getState, markRead, start, subscribe, type Notif } from "./store";

export const KIND_META: Record<NotificationKind, { icon: LucideIcon; color: string; label: string }> = {
  task_assigned: { icon: ClipboardList, color: "#2563eb", label: "Task baru" },
  task_started: { icon: MapPin, color: "#0d9488", label: "Mulai dikerjakan" },
  job_done: { icon: CheckCheck, color: "#059669", label: "Job Done" },
  report_submitted: { icon: FileText, color: "#7c3aed", label: "Laporan masuk" },
  report_resubmitted: { icon: FileText, color: "#7c3aed", label: "Revisi dikirim" },
  review_started: { icon: Eye, color: "#0284c7", label: "Direview" },
  revision_requested: { icon: RotateCcw, color: "#d97706", label: "Perlu revisi" },
  task_approved: { icon: BadgeCheck, color: "#16a34a", label: "Disetujui" },
  task_cancelled: { icon: XCircle, color: "#71717a", label: "Dibatalkan" },
  due_soon: { icon: Clock, color: "#d97706", label: "Deadline dekat" },
  overdue: { icon: AlertTriangle, color: "#dc2626", label: "Overdue" },
  test: { icon: Bell, color: "#2563eb", label: "Uji" },
};

const sfxSnapshot = () => sfxEnabled();

/** Waktu ringkas untuk daftar: "baru", "5 mnt", "2 j", "kemarin", "3 hr", "12 Okt". */
function ago(iso: string) {
  const d = new Date(iso);
  const m = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (m < 1) return "baru";
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} j`;
  const days = Math.floor(h / 24);
  if (days === 1) return "kemarin";
  if (days < 7) return `${days} hr`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(d);
}

export function NotificationBell() {
  const router = useRouter();
  const st = useSyncExternalStore(subscribe, getState, getServerState);
  const sound = useSyncExternalStore(subscribeSfx, sfxSnapshot, () => true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    unlockSfx();
    return start((fresh) => {
      // toast in-app untuk notifikasi baru (maks. 2 supaya tidak membanjiri)
      for (const n of fresh.slice(0, 2)) {
        const tone = n.kind === "overdue" || n.kind === "revision_requested" ? "warning" : n.kind === "task_approved" ? "success" : "info";
        notify[tone](n.title, {
          description: n.body,
          duration: 7000,
          id: n.id,
          action: n.url ? { label: "Buka", onClick: () => openItem(n) } : undefined,
        });
      }
      if (fresh.length > 2) notify.info(`+${fresh.length - 2} notifikasi lain`, { action: { label: "Lihat", onClick: () => setOpen(true) } });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openItem(n: Notif) {
    if (!n.readAt) markRead([n.id]);
    setOpen(false);
    if (n.url) router.push(n.url);
  }

  const items = filter === "unread" ? st.items.filter((n) => !n.readAt) : st.items;
  const today = new Date().toDateString();
  const groups = [
    { label: "Hari ini", list: items.filter((n) => new Date(n.createdAt).toDateString() === today) },
    { label: "Sebelumnya", list: items.filter((n) => new Date(n.createdAt).toDateString() !== today) },
  ].filter((g) => g.list.length);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tour="notifications"
          aria-label={st.unread ? `Notifikasi, ${st.unread} belum dibaca` : "Notifikasi"}
          className="press relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-foreground/[0.06] data-[state=open]:text-foreground"
        >
          <Bell className="size-[18px]" strokeWidth={2.1} />
          {st.unread > 0 && (
            <span className="tabular absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10.5px] font-semibold leading-none text-white ring-2 ring-background">
              {st.unread > 99 ? "99+" : st.unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} collisionPadding={8} onOpenAutoFocus={(e) => e.preventDefault()} className="flex max-h-[min(600px,calc(100dvh-90px))] w-[min(392px,calc(100vw-16px))] flex-col overflow-hidden rounded-2xl p-0">
        <div className="flex items-center gap-2 border-b px-4 pb-2.5 pt-3">
          <p className="flex-1 text-[15px] font-semibold tracking-[-0.01em]">
            Notifikasi
            {st.unread > 0 && <span className="tabular ml-2 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[11.5px] font-medium text-red-600 dark:text-red-400">{st.unread} baru</span>}
          </p>
          <IconButton icon={sound ? Volume2 : VolumeX} label={sound ? "Matikan suara" : "Nyalakan suara"} onClick={() => setSfxEnabled(!sound)} />
          <IconButton icon={CheckCheck} label="Tandai semua dibaca" disabled={!st.unread} onClick={() => markRead()} />
        </div>

        <PushPrompt />

        <div className="flex gap-1 px-4 pt-2.5">
          {(
            [
              ["all", "Semua"],
              ["unread", "Belum dibaca"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className="chip h-7 px-2.5 text-[12px]">
              {l}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-1 [scrollbar-width:thin]">
          {!st.loaded ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-foreground/[0.04]" />
              ))}
            </div>
          ) : groups.length ? (
            groups.map((g) => (
              <div key={g.label}>
                <p className="px-2.5 pb-1 pt-2.5 text-[11.5px] font-medium text-muted-foreground">{g.label}</p>
                <ul className="space-y-1.5">
                  {g.list.map((n) => (
                    <li key={n.id}>
                      <NotificationRow n={n} onOpen={() => openItem(n)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="mb-3 flex size-10 items-center justify-center rounded-xl border bg-card shadow-[var(--shadow-card)]">
                <Bell className="size-[18px] text-muted-foreground" />
              </span>
              <p className="text-[14px] font-medium">{filter === "unread" ? "Semua sudah dibaca" : "Belum ada notifikasi"}</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">Kabar tentang task kamu akan muncul di sini.</p>
            </div>
          )}
        </div>

        <Link href="/account#notifikasi" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5 border-t py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.03] hover:text-foreground">
          <Settings2 className="size-3.5" /> Pengaturan notifikasi
        </Link>
      </PopoverContent>
    </Popover>
  );
}

export function NotificationRow({ n, onOpen }: { n: Notif; onOpen?: () => void }) {
  const meta = KIND_META[n.kind] ?? KIND_META.test;
  const unread = !n.readAt;
  return (
    <button type="button" onClick={onOpen} className={cn("group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150 hover:bg-foreground/[0.04]", unread && "bg-primary/[0.035]")}>
      <IconTile icon={meta.icon} color={meta.color} size="sm" className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 text-[13.5px] leading-snug", unread ? "font-semibold" : "font-medium text-foreground/80")}>{n.title}</span>
          <span className="tabular shrink-0 text-[11px] text-muted-foreground">{ago(n.createdAt)}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-relaxed text-muted-foreground">{n.body}</span>
      </span>
      <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full bg-primary transition-opacity", unread ? "opacity-100" : "opacity-0")} />
    </button>
  );
}

/** Ajakan aktifkan push di perangkat ini — hanya bila relevan. */
function PushPrompt() {
  const st = useSyncExternalStore(subscribe, getState, getServerState);
  const [busy, setBusy] = useState(false);
  if (!["off", "denied", "ios-install"].includes(st.push)) return null;
  const copy =
    st.push === "denied"
      ? { icon: BellOff, text: "Notifikasi diblokir browser. Izinkan lewat ikon gembok di address bar." }
      : st.push === "ios-install"
        ? { icon: BellRing, text: "Di iPhone, pasang Relay ke Layar Utama dulu agar bisa menerima notifikasi." }
        : { icon: BellRing, text: "Dapatkan notifikasi di perangkat ini walau Relay sedang ditutup." };
  return (
    <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-l-[3px] border-l-primary bg-card px-3 py-2.5">
      <copy.icon className="size-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-muted-foreground">{copy.text}</p>
      {st.push === "off" && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await enablePush();
            setBusy(false);
            if (r.ok) notify.success("Notifikasi perangkat aktif");
            else notify.error(r.error ?? "Gagal mengaktifkan");
          }}
          className="press h-8 shrink-0 rounded-lg bg-foreground px-3 text-[12px] font-medium text-background disabled:opacity-50"
        >
          Aktifkan
        </button>
      )}
    </div>
  );
}

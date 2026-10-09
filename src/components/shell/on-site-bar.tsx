"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import { fmtDuration } from "@/lib/format";

/**
 * Pengingat check-in yang masih terbuka (teknisi), menempel di bawah header di semua halaman.
 * Supaya saat membuka task lain teknisi tahu masih "di lokasi" task sebelumnya dan perlu check-out.
 * Disembunyikan di halaman task itu sendiri (di sana status & tombol check-out sudah terlihat).
 */

// Detak per menit untuk durasi "sudah berapa lama di lokasi". Server/hydrasi: null → durasi belum tampil.
let tick = 0;
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribe(cb: () => void) {
  subs.add(cb);
  timer ??= setInterval(() => {
    tick = Date.now();
    subs.forEach((f) => f());
  }, 60_000);
  return () => {
    subs.delete(cb);
    if (!subs.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const snapshot = () => tick || (tick = Date.now());

export function OnSiteBar({ taskId, code, title, since, checkInAt }: { taskId: string; code: string; title: string; since: string; checkInAt: string }) {
  const path = usePathname();
  const now = useSyncExternalStore(subscribe, snapshot, () => null);
  if (path.startsWith(`/tasks/${taskId}`)) return null;
  const elapsed = now ? fmtDuration(now - new Date(checkInAt).getTime()) : null;

  return (
    <Link
      href={`/tasks/${taskId}?tab=checklist`}
      data-on-site-bar
      className="group block border-t border-emerald-500/15 bg-emerald-500/[0.07] outline-none focus-visible:bg-emerald-500/[0.12] dark:bg-emerald-400/[0.08]"
    >
      <div className="mx-auto flex h-10 max-w-5xl items-center gap-2.5 px-4 text-[13px] lg:px-8">
        <span className="relative flex size-2 shrink-0" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
          <span className="relative size-2 rounded-full bg-emerald-500" />
        </span>
        <p className="min-w-0 flex-1 truncate">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="sm:hidden">Di lokasi</span>
            <span className="max-sm:hidden">Kamu di lokasi</span>
          </span>
          <span className="font-mono text-[12.5px] text-foreground"> {code}</span>
          <span className="text-muted-foreground">
            <span className="max-sm:hidden"> · {title}</span> · sejak {since}
            {elapsed ? <span className="max-sm:hidden"> ({elapsed})</span> : null}
          </span>
        </p>
        <span className="flex shrink-0 items-center gap-0.5 text-[12.5px] font-medium text-emerald-700 dark:text-emerald-400">
          Buka
          <ChevronRight className="size-4 transition-transform duration-150 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

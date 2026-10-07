"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function ConnectionDot({ className }: { className?: string }) {
  const online = useOnline();
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium", online ? "text-muted-foreground" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", className)}>
      <span className={cn("size-2 rounded-full", online ? "bg-emerald-500" : "bg-amber-500")} />
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="sticky top-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white">
      Kamu sedang offline. Data yang tampil adalah versi terakhir; aksi akan aktif lagi saat online.
    </div>
  );
}

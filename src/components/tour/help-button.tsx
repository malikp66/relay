"use client";

import { CircleHelp } from "lucide-react";
import { useTour } from "./tour-provider";
import { cn } from "@/lib/utils";

/**
 * Tombol "Panduan" yang ditempel di samping judul halaman — menjalankan tur khusus halaman itu.
 * Sengaja di area konten (bukan header global) agar jelas panduannya milik halaman ini.
 */
/** `compact`: di HP hanya ikon (baris yang sudah padat, mis. header detail task). */
export function HelpButton({ className, compact }: { className?: string; compact?: boolean }) {
  const { startPage, hasPageTour } = useTour();
  if (!hasPageTour) return null;
  return (
    <button
      type="button"
      data-tour="help"
      onClick={startPage}
      aria-label="Panduan halaman ini"
      title="Lihat panduan halaman ini"
      className={cn(
        "press inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border bg-card text-[12.5px] font-medium text-muted-foreground shadow-[var(--shadow-card)] outline-none",
        // compact: di HP lingkaran 28px dengan ikon tepat di tengah, di sm+ pil berlabel
        compact ? "size-7 sm:w-auto sm:pl-2 sm:pr-2.5" : "h-7 pl-2 pr-2.5",
        "transition-[color,border-color,background-color] duration-150 hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <CircleHelp className="size-4 shrink-0 sm:size-[15px]" strokeWidth={2} />
      <span className={cn(compact && "max-sm:sr-only")}>Panduan</span>
    </button>
  );
}

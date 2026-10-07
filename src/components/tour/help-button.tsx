"use client";

import { CircleHelp } from "lucide-react";
import { useTour } from "./tour-provider";
import { cn } from "@/lib/utils";

/**
 * Tombol "Panduan" yang ditempel di samping judul halaman — menjalankan tur khusus halaman itu.
 * Sengaja di area konten (bukan header global) agar jelas panduannya milik halaman ini.
 */
export function HelpButton({ className }: { className?: string }) {
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
        "press inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border bg-card pl-2 pr-2.5 text-[12.5px] font-medium text-muted-foreground shadow-[var(--shadow-card)] outline-none",
        "transition-[color,border-color,background-color] duration-150 hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <CircleHelp className="size-[15px]" strokeWidth={2.2} />
      Panduan
    </button>
  );
}

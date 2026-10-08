"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pilihan bersegmen kecil (mis. tipe item checklist: Centang / Data / Foto).
 * Segmen aktif harus jelas terbaca di terang & gelap: latar kartu + garis tipis + teks tebal + ikon warna utama,
 * bukan sekadar putih di atas abu muda.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  compactInactive,
  size = "sm",
}: {
  options: readonly { id: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  /** di HP, segmen tidak aktif hanya ikon (hemat tempat) */
  compactInactive?: boolean;
  /** md = setinggi kotak isian (44px), untuk dipasang di samping input */
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex bg-foreground/[0.06]", size === "md" ? "h-11 rounded-xl p-1" : "rounded-lg p-0.5")}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex items-center gap-1 outline-none transition-[color,background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50",
              size === "md" ? "h-9 rounded-lg px-3.5 text-[13.5px]" : "h-7 rounded-md px-2 text-[12px]",
              on
                ? "bg-card font-semibold text-foreground shadow-[0_1px_2px_rgb(16_24_40/0.1)] ring-1 ring-foreground/[0.12] dark:bg-white/[0.14] dark:ring-white/[0.08]"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {o.icon && <o.icon className={cn("size-3.5", on && "text-primary")} />}
            <span className={cn(compactInactive && !on && "hidden sm:inline")}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

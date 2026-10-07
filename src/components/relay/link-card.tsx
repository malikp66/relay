import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconTile } from "./icon-button";

/**
 * Kartu navigasi ala Upstash console: ubin ikon berwarna, judul, deskripsi,
 * panah yang muncul saat hover; border + tint + bayangan offset mengikuti warna ikon.
 * Panah diposisikan absolut supaya tidak memotong judul.
 */
export function LinkCard({ href, icon, color, title, description, meta, className }: { href: string; icon: LucideIcon; color: string; title: string; description?: string; meta?: ReactNode; className?: string }) {
  return (
    <Link href={href} style={{ "--tint": color } as CSSProperties} className={cn("card-interactive group flex flex-col rounded-2xl p-4 pr-11 outline-none sm:p-5 sm:pr-12", className)}>
      <ArrowRight className="reveal-arrow absolute right-4 top-[22px] size-[18px] text-foreground/70 sm:right-5 sm:top-[26px]" aria-hidden />
      <div className="flex items-center gap-3">
        <IconTile icon={icon} color={color} />
        <span className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">{title}</span>
        {meta}
      </div>
      {description ? <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p> : null}
    </Link>
  );
}

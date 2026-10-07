import { X, type LucideIcon } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Variant = "ghost" | "subtle" | "overlay";

const VARIANTS: Record<Variant, string> = {
  /** Default: transparan, muncul latar saat hover. Untuk header dialog/sheet/banner. */
  ghost: "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
  /** Selalu ada latar tipis. */
  subtle: "bg-foreground/[0.05] text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
  /** Di atas gambar/thumbnail. */
  overlay: "bg-zinc-950/70 text-white backdrop-blur-sm hover:bg-zinc-950/85 ring-1 ring-white/20",
};

const SIZES = { sm: "size-6 [&_svg]:size-3.5", md: "size-8 [&_svg]:size-4", lg: "size-10 [&_svg]:size-[18px]" };

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; variant?: Variant; size?: keyof typeof SIZES };

/**
 * Tombol ikon seragam: bulat, ikon presisi di tengah, area sentuh minimal 40px (pseudo-element),
 * focus ring jelas, umpan balik tekan halus. (ref: Vercel Web Interface Guidelines)
 */
export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton({ icon: Icon, label, variant = "ghost", size = "md", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "press relative inline-flex shrink-0 items-center justify-center rounded-full outline-none",
        "transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)]",
        "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "before:absolute before:-inset-2 before:content-[''] disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      <Icon strokeWidth={2.25} aria-hidden />
    </button>
  );
});

export const CloseButton = forwardRef<HTMLButtonElement, Omit<Props, "icon" | "label"> & { label?: string }>(function CloseButton({ label = "Tutup", ...props }, ref) {
  return <IconButton ref={ref} icon={X} label={label} {...props} />;
});

/** Ubin ikon berwarna (gaya Upstash): kotak membulat, ikon putih. */
export function IconTile({ icon: Icon, color, size = "md", className }: { icon: LucideIcon; color: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sz = size === "sm" ? "size-7 rounded-lg [&_svg]:size-3.5" : size === "lg" ? "size-11 rounded-xl [&_svg]:size-5" : "size-8 rounded-[10px] [&_svg]:size-4";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(0_0_0/0.12)]", sz, className)}
      style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${color} 88%, white), ${color})` } as CSSProperties}
    >
      <Icon strokeWidth={2.25} aria-hidden />
    </span>
  );
}

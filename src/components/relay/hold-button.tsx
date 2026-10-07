"use client";

/**
 * Tombol tekan-tahan untuk aksi penting (Check-in, Job Done, Kirim, Approve).
 * Diadaptasi dari KokonutUI Hold Button (MIT) — https://kokonutui.com
 *
 * Motion: progres memakai transform scaleX (GPU), linear saat ditahan,
 * kembali dengan ease-out cepat saat dilepas; tekan → skala 0.98; centang saat selesai.
 */
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { Check, Loader2, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

const tones = {
  primary: { base: "bg-primary text-primary-foreground", fill: "bg-white/20" },
  success: { base: "bg-emerald-600 text-white", fill: "bg-white/20" },
  danger: { base: "bg-red-600 text-white", fill: "bg-white/20" },
  warning: { base: "bg-amber-500 text-white", fill: "bg-white/25" },
  neutral: { base: "bg-secondary text-secondary-foreground ring-1 ring-inset ring-border", fill: "bg-foreground/[0.08]" },
} as const;

type Props = {
  label: string;
  holdingLabel?: string;
  icon?: LucideIcon;
  tone?: keyof typeof tones;
  duration?: number;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onComplete: () => void | Promise<void>;
};

type Phase = "idle" | "holding" | "done";

export function HoldButton({ label, holdingLabel = "Tahan terus…", icon: Icon, tone = "primary", duration = 1000, disabled, loading, className, onComplete }: Props) {
  const controls = useAnimationControls();
  const [phase, setPhase] = useState<Phase>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start() {
    if (disabled || loading || phase === "done") return;
    setPhase("holding");
    controls.set({ scaleX: 0 });
    controls.start({ scaleX: 1, transition: { duration: duration / 1000, ease: "linear" } });
    timer.current = setTimeout(async () => {
      timer.current = null;
      setPhase("done");
      navigator.vibrate?.(20);
      try {
        await onComplete();
      } finally {
        setPhase("idle");
        controls.start({ scaleX: 0, transition: { duration: 0.25, ease: ease.out } });
      }
    }, duration);
  }

  function cancel() {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    setPhase("idle");
    controls.start({ scaleX: 0, transition: { duration: 0.2, ease: ease.out } });
  }

  const t = tones[tone];
  const text = loading ? "Memproses…" : phase === "holding" ? holdingLabel : label;
  const glyph = loading ? "loading" : phase === "done" ? "done" : "icon";

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => (e.key === " " || e.key === "Enter") && cancel()}
      className={cn(
        "relative h-14 w-full touch-none select-none overflow-hidden rounded-2xl px-5 text-[15px] font-semibold outline-none",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_1px_2px_rgb(0_0_0/0.1)]",
        "transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.98]",
        "focus-visible:ring-4 focus-visible:ring-ring/30 disabled:opacity-50",
        t.base,
        className,
      )}
    >
      <motion.span aria-hidden animate={controls} initial={{ scaleX: 0 }} style={{ originX: 0 }} className={cn("absolute inset-0", t.fill)} />
      <span className="relative z-10 flex items-center justify-center gap-2">
        <span className="relative flex size-5 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={glyph} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15, ease: ease.out }} className="flex">
              {glyph === "loading" ? <Loader2 className="size-5 animate-spin" /> : glyph === "done" ? <Check className="size-5" strokeWidth={3} /> : Icon ? <Icon className="size-5" /> : null}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="tabular">{text}</span>
      </span>
    </button>
  );
}

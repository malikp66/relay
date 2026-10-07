"use client";

/**
 * Notifikasi global Relay (kanan atas). Semua toast di aplikasi lewat sini — jangan pakai `toast` sonner langsung.
 *
 *   notify.success("Tersimpan")
 *   notify.error("Gagal", { description: "Coba lagi" })
 *   notify.info("Versi baru tersedia", { action: { label: "Muat ulang", onClick }, duration: Infinity })
 *   const id = notify.warning("…", { duration: Infinity }); notify.dismiss(id)
 */
import { AlertTriangle, Check, Info, X, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { toast } from "sonner";
import { CloseButton } from "./icon-button";
import { cn } from "@/lib/utils";

export type NotifyTone = "success" | "error" | "warning" | "info";
type Opts = { description?: ReactNode; action?: { label: string; onClick: () => void }; duration?: number; id?: string | number };

const TONE: Record<NotifyTone, { icon: LucideIcon; badge: string; bar: string }> = {
  success: { icon: Check, badge: "bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400", bar: "bg-emerald-500" },
  error: { icon: X, badge: "bg-red-500/10 text-red-600 dark:bg-red-400/15 dark:text-red-400", bar: "bg-red-500" },
  warning: { icon: AlertTriangle, badge: "bg-amber-500/12 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400", bar: "bg-amber-500" },
  info: { icon: Info, badge: "bg-primary/10 text-primary dark:bg-primary/20", bar: "bg-primary" },
};

const DEFAULT_DURATION: Record<NotifyTone, number> = { success: 3500, info: 4500, warning: 6000, error: 6000 };

function ToastCard({ id, tone, title, description, action, duration }: { id: string | number; tone: NotifyTone; title: ReactNode } & Opts) {
  const t = TONE[tone];
  const Icon = t.icon;
  const finite = Number.isFinite(duration);
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="group/toast pointer-events-auto relative w-full overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-[var(--shadow-pop)] sm:w-[360px]"
    >
      <div className="flex items-start gap-3 py-3 pl-3.5 pr-2">
        <span className={cn("mt-px flex size-7 shrink-0 items-center justify-center rounded-full", t.badge)}>
          <Icon className="size-[15px]" strokeWidth={2.6} />
        </span>
        <div className="min-w-0 flex-1 pt-[3px]">
          <p className="text-[14px] font-semibold leading-snug tracking-[-0.005em]">{title}</p>
          {description ? <div className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{description}</div> : null}
          {action ? (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                toast.dismiss(id);
              }}
              className="press mt-2.5 inline-flex h-7 items-center rounded-lg bg-foreground px-2.5 text-[12.5px] font-medium text-background transition-opacity duration-150 hover:opacity-90"
            >
              {action.label}
            </button>
          ) : null}
        </div>
        <CloseButton size="sm" onClick={() => toast.dismiss(id)} className="-mt-0.5" />
      </div>
      {finite && (
        <span
          aria-hidden
          style={{ "--toast-duration": `${duration}ms` } as CSSProperties}
          className={cn(
            "absolute inset-x-0 bottom-0 h-[2px] origin-left opacity-60",
            "animate-[toast-countdown_var(--toast-duration)_linear_forwards] group-hover/toast:[animation-play-state:paused]",
            t.bar,
          )}
        />
      )}
    </div>
  );
}

function show(tone: NotifyTone, title: ReactNode, opts: Opts = {}) {
  const duration = opts.duration ?? DEFAULT_DURATION[tone];
  return toast.custom((id) => <ToastCard id={id} tone={tone} title={title} {...opts} duration={duration} />, { duration, id: opts.id });
}

export const notify = {
  success: (title: ReactNode, opts?: Opts) => show("success", title, opts),
  error: (title: ReactNode, opts?: Opts) => show("error", title, opts),
  warning: (title: ReactNode, opts?: Opts) => show("warning", title, opts),
  info: (title: ReactNode, opts?: Opts) => show("info", title, opts),
  dismiss: (id?: string | number) => toast.dismiss(id),
};

// Dev: panggil dari console, mis. relayNotify.success("Halo", { description: "Tes" })
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { relayNotify: typeof notify }).relayNotify = notify;
}

"use client";

/**
 * Global alert scaffold Relay.
 *
 * 1. <Alert>        — pesan di dalam halaman (callout: kartu netral + border kiri melengkung berwarna)
 * 2. notify         — notifikasi singkat di kanan atas (lihat ./notify)
 * 3. useAlert()     — dialog global berbasis Promise (confirm / alert) + banner persisten di kanan atas
 *
 *   const { confirm, banner } = useAlert();
 *   if (await confirm({ title: "Hapus site?", tone: "danger", confirmLabel: "Hapus" })) { ... }
 *   banner.show({ id: "maint", tone: "warning", title: "Maintenance 22.00", message: "Relay offline ±10 menit." });
 *   notify.success("Tersimpan");
 */
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Callout } from "./callout";
import { CloseButton } from "./icon-button";
import { notify } from "./notify";

export { notify };
export type Tone = "info" | "success" | "warning" | "danger";

const ICON: Record<Tone, LucideIcon> = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };
const BADGE: Record<Tone, string> = {
  info: "bg-primary/10 text-primary dark:bg-primary/20",
  success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
};
const CONFIRM_BTN: Record<Tone, string> = {
  info: "",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

/* ───────────── Inline ───────────── */

export function Alert({ tone = "info", title, children, action, onDismiss, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; action?: ReactNode; onDismiss?: () => void; className?: string }) {
  return (
    <Callout
      tone={tone}
      icon={ICON[tone]}
      title={title}
      action={action}
      className={className}
      trailing={onDismiss ? <CloseButton size="sm" onClick={onDismiss} className="-mr-1 -mt-0.5" /> : undefined}
    >
      {children}
    </Callout>
  );
}

/* ───────────── Dialog & banner global ───────────── */

type DialogOpts = { title: string; description?: ReactNode; tone?: Tone; confirmLabel?: string; cancelLabel?: string };
type BannerOpts = { id: string; title: string; message?: ReactNode; tone?: Tone; action?: { label: string; onClick: () => void } };

type Ctx = {
  confirm: (o: DialogOpts) => Promise<boolean>;
  alert: (o: Omit<DialogOpts, "cancelLabel">) => Promise<void>;
  banner: { show: (b: BannerOpts) => void; dismiss: (id: string) => void };
};

const AlertCtx = createContext<Ctx | null>(null);

export function useAlert() {
  const ctx = useContext(AlertCtx);
  if (!ctx) throw new Error("useAlert harus dipakai di dalam <AlertProvider>");
  return ctx;
}

const NOTIFY_TONE = { info: "info", success: "success", warning: "warning", danger: "error" } as const;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(DialogOpts & { kind: "confirm" | "alert" }) | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const open = useCallback((o: DialogOpts, kind: "confirm" | "alert") => {
    resolver.current?.(false);
    setDialog({ ...o, kind });
    return new Promise<boolean>((res) => (resolver.current = res));
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setDialog(null);
  };

  const value = useMemo<Ctx>(
    () => ({
      confirm: (o) => open(o, "confirm"),
      alert: async (o) => {
        await open(o, "alert");
      },
      banner: {
        // banner = notifikasi persisten di kanan atas (sampai ditutup / dismiss)
        show: (b) => notify[NOTIFY_TONE[b.tone ?? "info"]](b.title, { id: `banner-${b.id}`, description: b.message, action: b.action, duration: Infinity }),
        dismiss: (id) => notify.dismiss(`banner-${id}`),
      },
    }),
    [open],
  );

  const tone = dialog?.tone ?? "info";
  const Icon = ICON[tone];

  return (
    <AlertCtx.Provider value={value}>
      {children}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && close(false)}>
        <DialogContent showCloseButton={false} className="max-w-[380px] gap-0 rounded-2xl p-5">
          <span className={cn("flex size-10 items-center justify-center rounded-full", BADGE[tone])}>
            <Icon className="size-5" strokeWidth={2.2} />
          </span>
          <DialogTitle className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">{dialog?.title}</DialogTitle>
          {dialog?.description ? <DialogDescription className="mt-1.5 text-[14px] leading-relaxed">{dialog.description}</DialogDescription> : null}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {dialog?.kind === "confirm" && (
              <Button variant="outline" className="h-10 rounded-xl bg-card sm:min-w-24" onClick={() => close(false)}>
                {dialog.cancelLabel ?? "Batal"}
              </Button>
            )}
            <Button className={cn("h-10 rounded-xl sm:min-w-24", CONFIRM_BTN[tone])} onClick={() => close(true)} autoFocus>
              {dialog?.confirmLabel ?? (dialog?.kind === "confirm" ? "Lanjutkan" : "Mengerti")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AlertCtx.Provider>
  );
}

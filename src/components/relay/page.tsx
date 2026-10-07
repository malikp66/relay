import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Primitive halaman. Ritme spasi:
 *  - header halaman → konten: 24px
 *  - antar seksi: 32px (space-y-8 di halaman)
 *  - judul seksi → isi: 12px
 *  - padding kartu: 16px (mobile) / 20px (≥sm)
 */

export function PageHeader({ title, subtitle, action, className }: { title: string; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {subtitle ? <p className="mt-1 text-[14px] leading-snug text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Section({ title, description, action, count, children, className }: { title?: string; description?: string; action?: ReactNode; count?: number; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      {title ? (
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
              {title}
              {count !== undefined ? <span className="tabular rounded-md bg-foreground/[0.06] px-1.5 text-[12px] font-medium leading-5 text-muted-foreground">{count}</span> : null}
            </h2>
            {description ? <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0 text-[13px] font-medium">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/15 px-6 py-10 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <Icon className="size-[18px] text-muted-foreground" />
      </div>
      <p className="text-[15px] font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

type Tone = "default" | "danger" | "warning" | "success" | "primary";
const TONE: Record<Tone, string> = {
  default: "text-foreground",
  danger: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
  primary: "text-foreground",
};

export type Metric = { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone };

/**
 * Kumpulan angka dalam SATU kartu dengan garis pemisah tipis (gaya analytics Vercel/Linear).
 * Tanpa ikon dekoratif; warna hanya untuk makna (merah = masalah, kuning = perhatian).
 */
export function Metrics({ items, cols = 4, className, ...rest }: { items: Metric[]; cols?: 2 | 3 | 4; className?: string; "data-tour"?: string }) {
  const grid = cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 md:grid-cols-4";
  return (
    <div {...rest} className={cn("overflow-hidden rounded-2xl border bg-border shadow-[var(--shadow-card)]", className)}>
      <dl className={cn("grid gap-px", grid)}>
        {items.map((m) => (
          <div key={m.label} className="flex min-w-0 flex-col bg-card px-4 py-3.5 sm:px-5 sm:py-4">
            <dt className="truncate text-[12.5px] font-medium text-muted-foreground">{m.label}</dt>
            <dd className={cn("tabular mt-1 text-[24px] font-semibold leading-none tracking-[-0.02em]", TONE[m.tone ?? "default"])}>{m.value}</dd>
            {m.hint ? <dd className="mt-1.5 truncate text-[12px] text-muted-foreground">{m.hint}</dd> : null}
          </div>
        ))}
        {/* sel pengisi agar garis grid tetap rapi saat jumlah ganjil */}
        {items.length % 2 === 1 && cols !== 3 ? <div className="bg-card md:hidden" /> : null}
      </dl>
    </div>
  );
}

/** Satu angka (dipakai jika berdiri sendiri). */
export function StatCard({ label, value, hint, tone = "default", className }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: Tone; className?: string }) {
  return <Metrics items={[{ label, value, hint, tone }]} cols={2} className={cn("[&_dl]:grid-cols-1", className)} />;
}

/** Kartu polos dengan judul opsional. */
export function Panel({ title, action, children, className, bodyClassName }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card shadow-[var(--shadow-card)]", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <h3 className="text-[14px] font-semibold tracking-[-0.01em]">{title}</h3>
          {action}
        </div>
      ) : null}
      <div className={cn("p-4 sm:p-5", title && "pt-3 sm:pt-3", bodyClassName)}>{children}</div>
    </div>
  );
}

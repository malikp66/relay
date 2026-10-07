import Link from "next/link";
import type { ReactNode } from "react";
import { ERRORS, type ErrorCode } from "@/lib/errors";
import { cn } from "@/lib/utils";

/** Tampilan error seragam untuk semua kode (dipakai not-found, forbidden, error boundary, /status/[code]). */
export function ErrorScreen({ code, title, description, actions, digest, compact }: { code: ErrorCode | number; title?: string; description?: string; actions?: ReactNode; digest?: string; compact?: boolean }) {
  const meta = (ERRORS as Record<number, { title: string; description: string }>)[code] ?? ERRORS[500];
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-16" : "min-h-dvh py-10")}>
      <span className="tabular mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 font-mono text-xs text-muted-foreground shadow-[var(--shadow-card)]">
        <span className="size-1.5 rounded-full bg-red-500" />
        Error {code}
      </span>
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance">{title ?? meta.title}</h1>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-pretty text-muted-foreground">{description ?? meta.description}</p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center">
        {actions ?? (
          <Link href="/dashboard" className="press inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground">
            Kembali ke beranda
          </Link>
        )}
      </div>
      {digest && <p className="mt-6 font-mono text-[11px] text-muted-foreground">Kode referensi: {digest}</p>}
    </div>
  );
}

export function HomeLink({ href = "/dashboard", label = "Kembali ke beranda", variant = "primary" }: { href?: string; label?: string; variant?: "primary" | "outline" }) {
  return (
    <Link href={href} className={cn("press inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-medium transition-colors duration-150", variant === "primary" ? "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] hover:bg-primary/90" : "border bg-card hover:bg-foreground/[0.04]")}>
      {label}
    </Link>
  );
}

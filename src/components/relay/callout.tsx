import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const CALLOUT_TONE = {
  danger: { border: "border-l-red-500", icon: "text-red-600 dark:text-red-400" },
  warning: { border: "border-l-amber-500", icon: "text-amber-600 dark:text-amber-400" },
  info: { border: "border-l-primary", icon: "text-primary" },
  neutral: { border: "border-l-foreground/30", icon: "text-muted-foreground" },
  success: { border: "border-l-emerald-500", icon: "text-emerald-600 dark:text-emerald-400" },
} as const;

/**
 * Callout tenang: kartu netral dengan border kiri 3px berwarna yang ikut melengkung
 * mengikuti radius kartu (border asli, bukan batang tempelan).
 */
export function Callout({
  tone = "neutral",
  icon: Icon,
  title,
  children,
  action,
  trailing,
  className,
}: {
  tone?: keyof typeof CALLOUT_TONE;
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  const t = CALLOUT_TONE[tone];
  return (
    <div className={cn("flex gap-3 rounded-xl border border-l-[3px] bg-card py-3 pl-3.5 pr-3 shadow-[var(--shadow-card)]", t.border, className)}>
      {Icon ? <Icon className={cn("mt-[2px] size-4 shrink-0", t.icon)} strokeWidth={2.2} /> : null}
      <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed">
        {title ? <p className="font-semibold leading-snug">{title}</p> : null}
        {children ? <div className={cn("text-muted-foreground", title && "mt-0.5")}>{children}</div> : null}
        {action ? <div className="mt-2.5">{action}</div> : null}
      </div>
      {trailing}
    </div>
  );
}

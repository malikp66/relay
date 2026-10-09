import { slaState } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Sisa/lewat SLA ("Lewat 5 j 54 m"). Satu gaya untuk kartu task & detail task. */
export function SlaBadge({ dueAt, status, className }: { dueAt: Date | string; status: string; className?: string }) {
  const sla = slaState(dueAt, status);
  if (!sla) return null;
  return (
    <span
      className={cn(
        "tabular inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium leading-none",
        sla.level === "overdue"
          ? "bg-red-500/10 text-red-600 dark:bg-red-400/15 dark:text-red-400"
          : sla.level === "soon"
            ? "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400"
            : "bg-foreground/[0.05] text-muted-foreground",
        className,
      )}
    >
      {sla.label}
    </span>
  );
}

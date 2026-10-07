import { cn } from "@/lib/utils";

/**
 * Daftar bar horizontal (gaya Vercel/Tremor "BarList"): label & angka di atas bar latar.
 * Lebih mudah dibaca di HP daripada chart batang.
 */
export function BarList({ items, valueLabel = "selesai", secondaryLabel }: { items: { label: string; value: number; secondary?: number }[]; valueLabel?: string; secondaryLabel?: string }) {
  const max = Math.max(...items.map((i) => i.value + (i.secondary ?? 0)), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((it) => {
        const total = it.value + (it.secondary ?? 0);
        return (
          <li key={it.label} className="relative flex h-9 items-center overflow-hidden rounded-lg px-3 text-[13px]">
            <span aria-hidden className="absolute inset-y-0 left-0 rounded-lg bg-foreground/[0.04]" style={{ width: `${(total / max) * 100}%` }} />
            <span aria-hidden className="absolute inset-y-0 left-0 rounded-lg bg-primary/[0.14]" style={{ width: `${(it.value / max) * 100}%` }} />
            <span className="relative flex-1 truncate font-medium">{it.label}</span>
            <span className="tabular relative ml-3 shrink-0 font-semibold">{it.value}</span>
            {it.secondary !== undefined && <span className={cn("tabular relative ml-2 w-14 shrink-0 text-right text-muted-foreground")}>+{it.secondary}</span>}
          </li>
        );
      })}
      <li className="flex justify-end gap-3 px-3 pt-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-primary/40" />
          {valueLabel}
        </span>
        {secondaryLabel && (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-foreground/15" />
            {secondaryLabel}
          </span>
        )}
      </li>
    </ul>
  );
}

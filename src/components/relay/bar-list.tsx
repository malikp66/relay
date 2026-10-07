import { cn } from "@/lib/utils";

/**
 * Daftar bar horizontal (gaya Vercel/Tremor "BarList").
 * Tiap baris: label + angka di satu garis, lalu bar tipis bertumpuk di bawahnya
 * (nilai utama solid, nilai kedua lebih pudar) — angka tidak pernah tertimpa bar.
 */
export function BarList({ items, valueLabel = "selesai", secondaryLabel }: { items: { label: string; value: number; secondary?: number }[]; valueLabel?: string; secondaryLabel?: string }) {
  const max = Math.max(...items.map((i) => i.value + (i.secondary ?? 0)), 1);
  const stacked = items.some((i) => i.secondary !== undefined);
  return (
    <div>
      <ul className="space-y-3.5">
        {items.map((it) => {
          const sec = it.secondary ?? 0;
          const total = it.value + sec;
          return (
            <li key={it.label}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate font-medium">{it.label}</span>
                <span className="tabular shrink-0 text-muted-foreground">
                  <span className="font-semibold text-foreground">{it.value}</span>
                  {stacked && <span>/{total}</span>}
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-foreground/[0.05]">
                <div className="flex h-full gap-0.5" style={{ width: `${(total / max) * 100}%` }}>
                  {it.value > 0 && <span className="h-full rounded-full bg-primary" style={{ flexGrow: it.value }} />}
                  {sec > 0 && <span className="h-full rounded-full bg-primary/25" style={{ flexGrow: sec }} />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className={cn("mt-4 flex items-center gap-4 border-t pt-3 text-[12px] text-muted-foreground")}>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-full bg-primary" />
          {valueLabel}
        </span>
        {secondaryLabel && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full bg-primary/25" />
            {secondaryLabel}
          </span>
        )}
        {stacked && <span className="ml-auto tabular">{valueLabel.toLowerCase()} / total</span>}
      </div>
    </div>
  );
}

"use client";

import { ChevronDown, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { ChipSelectTrigger, useQuietFocusReturn } from "@/components/relay/chip-select";
import { cn } from "@/lib/utils";

export type FilterOpt = { id: string; name: string };
export type FilterDef = { key: string; label: string; options: FilterOpt[] };
const ALL = "__all";

/**
 * Baris filter chip berbasis URL (?key=value), dipakai Statistik & Jadwal.
 * Parameter lain di URL (mis. ?day=, ?range=) tetap dipertahankan. Filter tanpa opsi tidak ditampilkan.
 */
export function FilterChips({ filters, className }: { filters: FilterDef[]; className?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const go = (sp: URLSearchParams) => start(() => router.replace(`${path}?${sp}`, { scroll: false }));
  const set = (k: string, v: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (v) sp.set(k, v);
    else sp.delete(k);
    go(sp);
  };
  const shown = filters.filter((f) => f.options.length);
  const activeCount = shown.filter((f) => params.get(f.key)).length;

  return (
    <div
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 transition-opacity duration-200 [scrollbar-width:none] max-lg:pr-8 max-lg:[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-32px),transparent)] lg:mx-0 lg:flex-wrap lg:px-0",
        pending && "opacity-60",
        className,
      )}
    >
      {shown.map((f) => (
        <FilterChip key={f.key} def={f} value={params.get(f.key)} onChange={(v) => set(f.key, v)} />
      ))}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => {
            const sp = new URLSearchParams(params.toString());
            shown.forEach((f) => sp.delete(f.key));
            go(sp);
          }}
          className="press flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <X className="size-3.5" /> Reset
        </button>
      )}
    </div>
  );
}

function FilterChip({ def, value, onChange }: { def: FilterDef; value: string | null; onChange: (v: string | null) => void }) {
  const current = def.options.find((o) => o.id === value);
  const quiet = useQuietFocusReturn();
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <ChipSelectTrigger {...quiet.triggerProps} aria-label={def.label} data-selected={!!current} className="h-9 w-auto shrink-0 gap-1.5 px-3.5">
        <span className={cn(current ? "text-muted-foreground/90" : "")}>{def.label}</span>
        {current && <span className="max-w-32 truncate font-semibold text-primary">{current.name}</span>}
        <ChevronDown className="size-3.5 opacity-60" />
      </ChipSelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={6} className="min-w-52" onCloseAutoFocus={quiet.onCloseAutoFocus}>
        <SelectItem value={ALL}>Semua {def.label.toLowerCase()}</SelectItem>
        {def.options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

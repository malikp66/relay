"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, X } from "lucide-react";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };
const ALL = "__all";

export function StatsFilters({ options }: { options: { groups: Opt[]; categories: Opt[]; products: Opt[]; techs: Opt[] } }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (k: string, v: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (v) sp.set(k, v);
    else sp.delete(k);
    start(() => router.replace(`${path}?${sp}`, { scroll: false }));
  };
  const filters: [string, string, Opt[]][] = [
    ["group", "Crew", options.groups],
    ["category", "Kategori", options.categories],
    ["product", "Produk", options.products],
    ["tech", "Teknisi", options.techs],
  ];
  const activeCount = filters.filter(([k]) => params.get(k)).length;

  return (
    <div className={cn("flex flex-col gap-3 transition-opacity duration-200 lg:flex-row lg:items-center lg:justify-between", pending && "opacity-60")}>
      <SmoothTabs
        className="w-full lg:w-[280px]"
        value={params.get("range") ?? "30"}
        onChange={(v) => set("range", v === "30" ? null : v)}
        items={[
          { id: "7", label: "7 hari" },
          { id: "30", label: "30 hari" },
          { id: "90", label: "90 hari" },
        ]}
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] max-lg:[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-32px),transparent)] max-lg:pr-8 lg:mx-0 lg:px-0">
        {filters
          .filter(([, , o]) => o.length)
          .map(([k, label, opts]) => {
            const value = params.get(k);
            const current = opts.find((o) => o.id === value);
            return (
              <Select key={k} value={value ?? ALL} onValueChange={(v) => set(k, v === ALL ? null : v)}>
                <SelectTrigger
                  aria-label={label}
                  data-selected={!!current}
                  className="chip h-9 w-auto shrink-0 gap-1.5 rounded-full px-3.5 shadow-none [&>svg:last-child]:hidden"
                >
                  <span className={cn(current ? "text-muted-foreground/90" : "")}>{label}</span>
                  {current && <span className="max-w-32 truncate font-semibold text-primary">{current.name}</span>}
                  <ChevronDown className="size-3.5 opacity-60" />
                </SelectTrigger>
                <SelectContent position="popper" align="start" sideOffset={6} className="min-w-52">
                  <SelectItem value={ALL}>Semua {label.toLowerCase()}</SelectItem>
                  {opts.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              const sp = new URLSearchParams(params.toString());
              filters.forEach(([k]) => sp.delete(k));
              start(() => router.replace(`${path}?${sp}`, { scroll: false }));
            }}
            className="press flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <X className="size-3.5" /> Reset
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BottomSheet } from "@/components/relay/bottom-sheet";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/relay/icon-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };
type Options = { groups: Opt[]; categories: Opt[]; products: Opt[]; priorities: Opt[]; assignees: Opt[] };

const FILTER_KEYS = [
  ["group", "Crew", "groups"],
  ["category", "Kategori", "categories"],
  ["product", "Produk", "products"],
  ["priority", "Prioritas", "priorities"],
  ["assignee", "Teknisi", "assignees"],
] as const;

export function TaskFilterBar({ view, counts, options, showReview }: { view: string; counts: Record<string, number>; options: Options; showReview: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function set(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    start(() => router.replace(`${path}?${sp.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) set({ q: q || null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = FILTER_KEYS.filter(([k]) => params.get(k));
  const tabs = [
    { id: "active", label: "Aktif", badge: counts.active },
    ...(showReview ? [{ id: "review", label: "Review", badge: counts.review }] : []),
    { id: "overdue", label: "Overdue", badge: counts.overdue },
    { id: "done", label: "Selesai" },
  ];

  return (
    <div className={cn("space-y-3 transition-opacity duration-200", pending && "opacity-60")}>
      <SmoothTabs items={tabs} value={view} onChange={(id) => set({ view: id === "active" ? null : id })} />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground" strokeWidth={2.1} />
          <Input
            type="search"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari task atau pelanggan"
            className="h-11 rounded-xl border-border bg-card pl-10 pr-9 shadow-[var(--shadow-card)] placeholder:text-muted-foreground/80 [&::-webkit-search-cancel-button]:hidden"
          />
          {q && <CloseButton size="sm" label="Hapus pencarian" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2" />}
        </div>
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title="Filter tugas"
          trigger={
            <Button variant="outline" aria-label="Filter" className="relative size-11 rounded-xl bg-card p-0 shadow-[var(--shadow-card)] sm:w-auto sm:px-3.5">
              <SlidersHorizontal className="size-[17px]" strokeWidth={2.1} />
              <span className="hidden sm:inline">Filter</span>
              {active.length > 0 && <span className="tabular absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-2 ring-background">{active.length}</span>}
            </Button>
          }
        >
          <div className="space-y-5 pb-2">
            {FILTER_KEYS.map(([key, label, optKey]) =>
              options[optKey].length ? (
                <div key={key}>
                  <p className="mb-2 text-sm font-medium">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {options[optKey].map((o) => {
                      const on = params.get(key) === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => set({ [key]: on ? null : o.id })}
                          aria-pressed={on}
                          className="chip"
                        >
                          {o.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null,
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => set(Object.fromEntries(FILTER_KEYS.map(([k]) => [k, null])))}>
                Reset
              </Button>
              <Button className="h-11 flex-1 rounded-xl" onClick={() => setOpen(false)}>
                Terapkan
              </Button>
            </div>
          </div>
        </BottomSheet>
      </div>
      {active.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {active.map(([k, label, optKey]) => (
            <button key={k} onClick={() => set({ [k]: null })} aria-label={`Hapus filter ${label}`} className="press group flex h-8 items-center gap-1 rounded-full border bg-card pl-3 pr-1 text-xs font-medium shadow-[var(--shadow-card)] transition-colors duration-150 hover:border-foreground/20">
              <span className="text-muted-foreground">{label}:</span> {options[optKey].find((o) => o.id === params.get(k))?.name ?? "-"}
              <span className="ml-0.5 flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 group-hover:bg-foreground/[0.06] group-hover:text-foreground">
                <X className="size-3.5" strokeWidth={2.25} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

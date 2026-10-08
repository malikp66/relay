"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { FilterChips } from "@/components/relay/filter-chips";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

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

  return (
    <div className={cn("flex flex-col gap-3 transition-opacity duration-200 lg:flex-row lg:items-center lg:justify-between", pending && "opacity-60")}>
      <div data-tour="stats-range" className="w-full lg:w-[280px]">
      <SmoothTabs
        className="w-full"
        value={params.get("range") ?? "30"}
        onChange={(v) => set("range", v === "30" ? null : v)}
        items={[
          { id: "7", label: "7 hari" },
          { id: "30", label: "30 hari" },
          { id: "90", label: "90 hari" },
        ]}
      />
      </div>
      <div data-tour="stats-filters" className="min-w-0">
        <FilterChips filters={filters.map(([key, label, options]) => ({ key, label, options }))} />
      </div>
    </div>
  );
}

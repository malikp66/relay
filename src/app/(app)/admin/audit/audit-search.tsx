"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { SearchInput } from "@/components/relay/search-input";
import { cn } from "@/lib/utils";

/** Cari teks di ringkasan audit (?q=), ditunda 300 ms supaya tidak memuat ulang setiap huruf. */
export function AuditSearch() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <SearchInput
      value={q}
      className={cn("transition-opacity", pending && "opacity-70")}
      placeholder="Cari aktivitas, mis. nama user atau template"
      onChange={(v) => {
        setQ(v);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const sp = new URLSearchParams(params.toString());
          if (v.trim()) sp.set("q", v.trim());
          else sp.delete("q");
          sp.delete("n");
          start(() => router.replace(`${path}?${sp}`, { scroll: false }));
        }, 300);
      }}
    />
  );
}

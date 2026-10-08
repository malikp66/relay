"use client";

import { Search } from "lucide-react";
import { CloseButton } from "@/components/relay/icon-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Kolom pencarian standar Relay (Tugas, Master data, User): ikon kiri, latar kartu, tombol hapus saat terisi. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange"> & { value: string; onChange: (v: string) => void }) {
  return (
    <div className={cn("relative flex-1", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground" strokeWidth={2.1} />
      <Input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border-border bg-card pl-10 pr-9 shadow-[var(--shadow-card)] placeholder:text-muted-foreground/80 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && <CloseButton size="sm" label="Hapus pencarian" onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2" />}
    </div>
  );
}

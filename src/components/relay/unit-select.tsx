"use client";

import { ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Satuan baku untuk item checklist tipe Data — supaya penulisan seragam di semua template & laporan. */
export const UNIT_GROUPS: { label: string; units: { id: string; hint: string }[] }[] = [
  { label: "Sinyal", units: [{ id: "dBm", hint: "daya optik / RF" }, { id: "dB", hint: "redaman, SNR" }] },
  { label: "Jaringan", units: [{ id: "Mbps", hint: "kecepatan" }, { id: "ms", hint: "latency / ping" }, { id: "%", hint: "packet loss, utilisasi" }] },
  { label: "Listrik", units: [{ id: "V", hint: "tegangan" }, { id: "A", hint: "arus" }, { id: "W", hint: "daya" }] },
  { label: "Lainnya", units: [{ id: "°C", hint: "suhu" }, { id: "m", hint: "panjang kabel" }, { id: "pcs", hint: "jumlah barang" }] },
];
const NONE = "__none";
const KNOWN = new Set(UNIT_GROUPS.flatMap((g) => g.units.map((u) => u.id)));

export function UnitSelect({ value, onChange, className }: { value: string; onChange: (unit: string) => void; className?: string }) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger
        aria-label="Satuan"
        data-selected={!!value}
        className={cn("chip h-8 min-h-8! w-auto shrink-0 gap-1.5 rounded-lg px-2.5 text-[12px] shadow-none [&>svg:last-child]:hidden", className)}
      >
        <span className="text-muted-foreground">Satuan</span>
        <span className={cn("font-mono font-semibold", value ? "text-primary" : "font-sans font-normal text-muted-foreground")}>{value || "Pilih"}</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={6} className="max-h-[320px] min-w-56">
        <SelectItem value={NONE}>Tanpa satuan</SelectItem>
        {value && !KNOWN.has(value) && <SelectItem value={value}>{value} (lama)</SelectItem>}
        {UNIT_GROUPS.map((g) => (
          <SelectGroup key={g.label}>
            <SelectSeparator />
            <SelectLabel className="text-[11px] font-medium text-muted-foreground">{g.label}</SelectLabel>
            {g.units.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                <span className="w-11 font-mono font-semibold">{u.id}</span>
                <span className="text-muted-foreground">{u.hint}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

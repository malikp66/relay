"use client";

import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuietFocusReturn } from "@/components/relay/chip-select";

/**
 * Pemilih satuan untuk item checklist tipe Data.
 * Daftar baku supaya penulisan seragam, plus satuan custom: ketik di kolom cari → "Pakai satuan …".
 */
export const UNIT_GROUPS: { label: string; units: { id: string; hint: string }[] }[] = [
  { label: "Sinyal", units: [{ id: "dBm", hint: "daya optik / RF" }, { id: "dB", hint: "redaman, SNR" }] },
  { label: "Jaringan", units: [{ id: "Mbps", hint: "kecepatan" }, { id: "ms", hint: "latency / ping" }, { id: "%", hint: "packet loss, utilisasi" }] },
  { label: "Listrik", units: [{ id: "V", hint: "tegangan" }, { id: "A", hint: "arus" }, { id: "W", hint: "daya" }] },
  { label: "Lainnya", units: [{ id: "°C", hint: "suhu" }, { id: "m", hint: "panjang kabel" }, { id: "pcs", hint: "jumlah barang" }] },
];
const ALL = UNIT_GROUPS.flatMap((g) => g.units);
const MAX = 12;

export function UnitSelect({ value, onChange, className }: { value: string; onChange: (unit: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const quiet = useQuietFocusReturn();
  const term = q.trim();
  const custom = !!value && !ALL.some((u) => u.id === value);

  const groups = useMemo(() => {
    const t = term.toLowerCase();
    return UNIT_GROUPS.map((g) => ({ ...g, units: g.units.filter((u) => !t || u.id.toLowerCase().includes(t) || u.hint.toLowerCase().includes(t)) })).filter((g) => g.units.length);
  }, [term]);
  const exact = ALL.find((u) => u.id.toLowerCase() === term.toLowerCase());

  const pick = (u: string) => {
    onChange(u);
    setOpen(false);
    setQ("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <button {...quiet.triggerProps} type="button" aria-label="Satuan" data-selected={!!value} className={cn("chip h-8 min-h-8! w-auto shrink-0 gap-1.5 rounded-lg px-2.5 text-[12px]", className)}>
          <span className="text-muted-foreground">Satuan</span>
          <span className={cn("max-w-24 truncate", value ? "font-mono font-semibold text-primary" : "text-muted-foreground")}>{value || "Pilih"}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-64 overflow-hidden rounded-xl p-0" onCloseAutoFocus={quiet.onCloseAutoFocus}>
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            maxLength={MAX}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !term) return;
              e.preventDefault();
              pick(exact?.id ?? term);
            }}
            placeholder="Cari atau ketik satuan lain"
            className="h-10 w-full bg-transparent pl-9 pr-3 text-[13.5px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1 [scrollbar-width:thin]">
          {term && !exact && (
            <button type="button" onClick={() => pick(term)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-foreground/[0.05]">
              <Plus className="size-3.5 text-primary" />
              Pakai satuan <span className="font-mono font-semibold text-primary">{term}</span>
            </button>
          )}
          {!term && (
            <Option active={!value} onClick={() => pick("")}>
              <span className="text-muted-foreground">Tanpa satuan</span>
            </Option>
          )}
          {!term && custom && (
            <Option active onClick={() => pick(value)}>
              <span className="w-12 font-mono font-semibold">{value}</span>
              <span className="text-muted-foreground">satuan custom</span>
            </Option>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">{g.label}</p>
              {g.units.map((u) => (
                <Option key={u.id} active={u.id === value} onClick={() => pick(u.id)}>
                  <span className="w-12 font-mono font-semibold">{u.id}</span>
                  <span className="truncate text-muted-foreground">{u.hint}</span>
                </Option>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Option({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors duration-100 hover:bg-foreground/[0.05]", active && "bg-foreground/[0.04]")}>
      {children}
      <Check className={cn("ml-auto size-3.5 shrink-0 text-primary", active ? "opacity-100" : "opacity-0")} />
    </button>
  );
}

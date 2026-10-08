"use client";

import { useState } from "react";
import { Segmented } from "@/components/relay/segmented";
import { TextInput } from "@/components/relay/form";
import { humanizeHours } from "@/lib/format";

/**
 * Isian lama SLA. Admin berpikir dalam "4 jam" atau "3 hari", bukan "72 jam":
 * pilih satuan, isi angka, atau ketuk preset. Disimpan sebagai jam bulat.
 * Di bawahnya ada contoh perhitungan deadline supaya jelas maksudnya.
 */
const PRESETS = [2, 4, 8, 24, 72, 168];
const EXAMPLE_START = new Date("2026-10-05T08:00:00+07:00"); // Senin 08.00 WIB
const fmt = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });


export function DurationField({ id, value, onChange, invalid, describedBy }: { id?: string; value: number | string; onChange: (hours: number | "") => void; invalid?: boolean; describedBy?: string }) {
  const hours = Number(value) || 0;
  const [unit, setUnit] = useState<"jam" | "hari">(() => (hours >= 24 && hours % 24 === 0 ? "hari" : "jam"));
  const shown = !hours ? "" : unit === "hari" ? String(+(hours / 24).toFixed(2)) : String(hours);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <TextInput
          id={id}
          inputMode="decimal"
          value={shown}
          invalid={invalid}
          aria-describedby={describedBy}
          placeholder={unit === "hari" ? "mis. 3" : "mis. 4"}
          onChange={(e) => {
            const n = Number(e.target.value.replace(",", "."));
            if (!e.target.value.trim()) return onChange("");
            if (Number.isNaN(n)) return;
            onChange(Math.round(unit === "hari" ? n * 24 : n));
          }}
          className="tabular w-28"
        />
        <Segmented
          label="Satuan SLA"
          options={[
            { id: "jam", label: "Jam" },
            { id: "hari", label: "Hari" },
          ]}
          value={unit}
          onChange={setUnit}
          size="md"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((h) => (
          <button key={h} type="button" aria-pressed={hours === h} onClick={() => {
              setUnit(h >= 24 ? "hari" : "jam");
              onChange(h);
            }} className="chip h-8 px-3 text-[12.5px]">
            {humanizeHours(h)}
          </button>
        ))}
      </div>
      {hours > 0 && (
        <div className="rounded-xl bg-foreground/[0.035] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          Deadline = jadwal mulai + <span className="font-semibold text-foreground">{humanizeHours(hours)}</span>. Contoh: task dijadwalkan {fmt.format(EXAMPLE_START)} → deadline{" "}
          <span className="font-semibold text-foreground">{fmt.format(new Date(EXAMPLE_START.getTime() + hours * 3600_000))}</span>.
        </div>
      )}
    </div>
  );
}

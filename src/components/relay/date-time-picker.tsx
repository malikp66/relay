"use client";

/**
 * Pemilih tanggal & jam Relay (pengganti input date/datetime bawaan browser).
 * Kalender bulan (Senin–Minggu, gaya sama dengan halaman Jadwal) + daftar jam per 30 menit + preset cepat.
 * Nilai memakai format lokal "YYYY-MM-DD" / "YYYY-MM-DDTHH:mm" (sama dengan input datetime-local).
 */
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
export const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toLocalDateTime = (d: Date) => `${toLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parse = (v: string) => {
  const [date, time = "00:00"] = v.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
};
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", opts).format(d);

/* ───────────── Kalender bulan ───────────── */

export function MonthCalendar({ value, onSelect, min, max }: { value?: string; onSelect: (ymd: string) => void; min?: string; max?: string }) {
  const sel = value ? value.slice(0, 10) : undefined;
  const [view, setView] = useState(() => {
    const d = sel ? parse(sel) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = toLocalDate(new Date());
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(1 - lead);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const shift = (n: number) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1));

  return (
    <div className="w-[280px] select-none">
      <div className="mb-1.5 flex items-center gap-1 pl-1.5">
        <p className="flex-1 text-[14px] font-semibold tracking-[-0.01em]">{fmt(view, { month: "long", year: "numeric" })}</p>
        <button type="button" aria-label="Bulan sebelumnya" onClick={() => shift(-1)} className="press flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground">
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" aria-label="Bulan berikutnya" onClick={() => shift(1)} className="press flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[11px] font-medium text-muted-foreground">
            {w}
          </span>
        ))}
        {days.map((d) => {
          const ymd = toLocalDate(d);
          const inMonth = d.getMonth() === view.getMonth();
          const disabled = (min && ymd < min) || (max && ymd > max);
          const isSel = ymd === sel;
          const isToday = ymd === today;
          return (
            <button
              key={ymd}
              type="button"
              disabled={!!disabled}
              onClick={() => onSelect(ymd)}
              aria-pressed={isSel}
              className={cn(
                "tabular mx-auto my-px flex size-8 sm:my-0.5 sm:size-9 items-center justify-center rounded-[10px] text-[13px] outline-none transition-[background-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50",
                isSel ? "bg-foreground font-semibold text-background" : isToday ? "font-semibold text-primary hover:bg-primary/10" : inMonth ? "hover:bg-foreground/[0.06]" : "text-muted-foreground/45 hover:bg-foreground/[0.04]",
                disabled && "pointer-events-none opacity-30",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── Trigger bergaya input ───────────── */

function Trigger({ icon: Icon, children, placeholder, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: typeof CalendarDays; placeholder?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "group flex h-12 w-full items-center gap-2.5 rounded-xl border bg-card px-3.5 text-left text-[14.5px] shadow-[var(--shadow-card)] outline-none transition-[border-color,box-shadow] duration-150 hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/20",
        className,
      )}
      {...props}
    >
      <Icon className="size-[18px] shrink-0 text-muted-foreground" />
      <span className={cn("min-w-0 flex-1 truncate", !children && "text-muted-foreground")}>{children ?? placeholder}</span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-[var(--ease-out)] group-data-[state=open]:rotate-180" />
    </button>
  );
}

/* ───────────── Tanggal saja ───────────── */

export function DatePicker({ value, onChange, max, min, placeholder = "Pilih tanggal", className }: { value?: string; onChange: (ymd: string) => void; max?: string; min?: string; placeholder?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Trigger icon={CalendarDays} placeholder={placeholder} className={className}>
          {value ? fmt(parse(value), { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : undefined}
        </Trigger>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-auto rounded-2xl p-3">
        <MonthCalendar
          value={value}
          min={min}
          max={max}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ───────────── Tanggal + jam ───────────── */

const SLOTS = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`);

export type Preset = { label: string; value: () => Date };

export function DateTimePicker({ value, onChange, presets, placeholder = "Pilih tanggal & jam", min, className }: { value?: string; onChange: (v: string) => void; presets?: Preset[]; placeholder?: string; min?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const date = value ? value.slice(0, 10) : toLocalDate(new Date());
  const time = value ? value.slice(11, 16) : "08:00";
  const timeList = useRef<HTMLDivElement>(null);
  const slots = SLOTS.includes(time) ? SLOTS : [...SLOTS, time].sort();

  // gulirkan daftar jam ke jam terpilih saat dibuka
  useEffect(() => {
    if (!open) return;
    // geser kontainer saja (bukan scrollIntoView) supaya halaman tidak ikut bergulir
    const t = setTimeout(() => {
      const box = timeList.current;
      const el = box?.querySelector<HTMLElement>("[aria-pressed=true]");
      if (!box || !el) return;
      box.scrollTop = el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2;
      box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2;
    }, 30);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Trigger icon={CalendarDays} placeholder={placeholder} className={className}>
          {value ? (
            <>
              {fmt(parse(value), { weekday: "short", day: "numeric", month: "short" })}
              <span className="mx-1.5 text-muted-foreground">·</span>
              <span className="tabular">{value.slice(11, 16).replace(":", ".")}</span>
            </>
          ) : undefined}
        </Trigger>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-[306px] max-w-[calc(100vw-16px)] rounded-2xl p-0 sm:w-[398px]">
        {presets?.length ? (
          <div className="flex gap-1.5 overflow-x-auto border-b px-3 py-2.5 [scrollbar-width:none]">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  onChange(toLocalDateTime(p.value()));
                  setOpen(false);
                }}
                className="chip h-8 shrink-0 px-3 text-[12.5px]"
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex flex-col sm:flex-row">
          <div className="p-3">
            <MonthCalendar value={date} min={min?.slice(0, 10)} onSelect={(d) => onChange(`${d}T${time}`)} />
          </div>
          <div className="flex flex-col border-t sm:w-[92px] sm:border-l sm:border-t-0">
            <p className="flex items-center gap-1.5 px-3 pb-1.5 pt-3 text-[11.5px] font-medium text-muted-foreground">
              <Clock className="size-3.5" /> Jam
            </p>
            <div ref={timeList} className="relative flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] sm:block sm:h-[264px] sm:space-y-0.5 sm:overflow-y-auto sm:px-2 sm:pb-2 sm:[scrollbar-width:thin]">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={s === time}
                  onClick={() => onChange(`${date}T${s}`)}
                  className={cn(
                    "tabular block h-8 shrink-0 rounded-lg px-3 sm:w-full sm:px-0 text-center text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/50",
                    s === time ? "bg-foreground font-semibold text-background" : "hover:bg-foreground/[0.06]",
                  )}
                >
                  {s.replace(":", ".")}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="hidden items-center justify-between gap-3 border-t px-3 py-2.5 sm:flex">
          <p className="truncate text-[12.5px] text-muted-foreground">{value ? fmt(parse(value), { weekday: "long", day: "numeric", month: "long" }) : "Belum dipilih"}</p>
          <button type="button" onClick={() => setOpen(false)} className="press h-8 shrink-0 rounded-lg bg-foreground px-3 text-[12.5px] font-medium text-background">
            Selesai
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { CircleAlert } from "lucide-react";
import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Kit form Relay — satu gaya untuk semua sheet & form (Master data, User, Crew, Laporan):
 * kotak satu baris 44px, teks panjang min. 96px, radius/border sama, error merah di bawah kolom.
 */
/* Latar kartu + garis tegas + bayangan tipis: tetap terlihat di atas sheet (bg-background) maupun kartu.
   Sama dengan kolom cari di halaman Tugas. */
export const BOX =
  "w-full rounded-xl border border-foreground/[0.14] bg-card px-3.5 text-base shadow-[0_1px_2px_rgb(16_24_40/0.05)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-red-500/70 aria-invalid:focus-visible:ring-red-500/20 disabled:opacity-60 sm:text-[14.5px] dark:border-white/[0.13] dark:shadow-none dark:hover:border-white/25";
export const LINE = cn(BOX, "h-11");
export const AREA = cn(BOX, "field-sizing-content min-h-24 resize-none py-2.5 leading-relaxed");

type FieldProps = { label: string; error?: string; hint?: ReactNode; optional?: boolean; className?: string; children: (id: string, describedBy?: string) => ReactNode };

/** Label + kontrol + hint/error. `children` menerima id & aria-describedby agar label dan pesan terhubung ke kontrol. */
export function Field({ label, error, hint, optional, className, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline gap-1.5 text-[13px] font-medium">
        {label}
        {optional && <span className="font-normal text-muted-foreground">· opsional</span>}
      </label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} role="alert" className="flex items-start gap-1.5 text-[12.5px] font-medium leading-snug text-red-600 dark:text-red-400">
          <CircleAlert className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-[12px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, ComponentProps<"input"> & { invalid?: boolean; suffix?: string }>(function TextInput({ invalid, suffix, className, ...props }, ref) {
  if (!suffix) return <input ref={ref} aria-invalid={invalid || undefined} className={cn(LINE, className)} {...props} />;
  return (
    <div className="relative">
      <input ref={ref} aria-invalid={invalid || undefined} className={cn(LINE, "pr-14", className)} {...props} />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">{suffix}</span>
    </div>
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea"> & { invalid?: boolean }>(function TextArea({ invalid, className, ...props }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(AREA, className)} {...props} />;
});

/** Dropdown bergaya kotak isian (bukan <select> bawaan browser). Nilai "" = belum/tidak dipilih. */
export function SelectBox({
  id,
  value,
  onChange,
  options,
  placeholder = "Pilih",
  emptyLabel,
  invalid,
  describedBy,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string; hint?: string }[];
  placeholder?: string;
  /** bila diisi, tampilkan pilihan "kosong" dengan label ini (mis. "Tanpa pelanggan") */
  emptyLabel?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const NONE = "__none";
  return (
    <Select value={value || (emptyLabel ? NONE : undefined)} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} className={cn(LINE, "justify-between gap-2 py-0 data-[placeholder]:text-muted-foreground [&>svg]:opacity-60")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={6} className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
        {emptyLabel && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
            {o.hint && <span className="ml-1.5 text-muted-foreground">{o.hint}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

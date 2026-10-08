"use client";

import { Check, Eye, Hash, Image as ImageIcon, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { notify } from "@/components/relay/notify";
import { saveChecklistResponseAction } from "@/app/actions/tasks";
import { PhotoUploader } from "@/components/relay/photo-uploader";
import { TextInput } from "@/components/relay/form";
import type { TaskDetail } from "@/server/queries";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Item = TaskDetail["items"][number];

/** Gaya kartu item — SAMA untuk tick/data/foto: border 1px, warna hijau tipis saat selesai, tanpa ring/bayangan offset. */
const TYPE_HINT: Record<Item["type"], (unit: string | null) => string> = {
  tick: () => "Centang bila sudah dikerjakan",
  data: (unit) => `Isi data${unit ? ` · ${unit}` : ""}`,
  photo: () => "Foto bukti",
};

function cardClass(done: boolean) {
  return cn(
    "rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] transition-[border-color,background-color] duration-200 ease-[var(--ease-out)]",
    done && "check-done",
  );
}

export function isItemDone(i: Item) {
  const r = i.response;
  if (!r) return false;
  if (i.type === "tick") return !!r.checked;
  if (i.type === "data") return !!r.value?.trim();
  return (r.photos?.length ?? 0) > 0;
}

export function ChecklistPanel({ items, editable }: { items: Item[]; editable: boolean }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Checklist kosong.</p>;
  const done = items.filter(isItemDone).length;
  const requiredLeft = items.filter((i) => i.required && !isItemDone(i)).length;
  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl border bg-card px-4 py-3.5 shadow-[var(--shadow-card)]">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[14px] font-semibold">
            <span className="tabular">{done}</span> dari <span className="tabular">{items.length}</span> selesai
          </p>
          <p className={cn("text-[12.5px] font-medium", requiredLeft ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
            {requiredLeft ? `${requiredLeft} item wajib tersisa` : "Semua item wajib terpenuhi"}
          </p>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
          <div className="h-full origin-left rounded-full bg-emerald-500 transition-transform duration-500 ease-[var(--ease-out)]" style={{ transform: `scaleX(${done / items.length})` }} />
        </div>
        {!editable && (
          <p className="mt-3 flex items-start gap-2 border-t pt-3 text-[12.5px] leading-relaxed text-muted-foreground">
            <Eye className="mt-[2px] size-3.5 shrink-0" />
            Mode lihat. Checklist hanya bisa diisi teknisi yang ditugaskan setelah check-in di lokasi.
          </p>
        )}
      </div>
      {items.map((it, i) => (
        <ChecklistItemCard key={it.id} item={it} index={i + 1} editable={editable} />
      ))}
    </div>
  );
}

function ChecklistItemCard({ item, index, editable }: { item: Item; index: number; editable: boolean }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(item.response?.value ?? "");
  const done = isItemDone(item);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const saved = item.response?.value ?? "";
  const flush = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (v !== saved) save({ value: v });
  };

  const save = (patch: { checked?: boolean; value?: string; photos?: string[] }) =>
    start(async () => {
      const res = await saveChecklistResponseAction(item.id, patch);
      if (!res.ok) notify.error(res.error);
    });

  const Icon = item.type === "tick" ? Check : item.type === "data" ? Hash : ImageIcon;
  const header = (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "relative mt-0.5 flex size-[26px] shrink-0 items-center justify-center rounded-[8px] border transition-[background-color,border-color,box-shadow] duration-200 ease-[var(--ease-out)]",
          done ? "border-emerald-600 bg-emerald-500 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]" : "border-foreground/20 bg-background text-muted-foreground",
        )}
      >
        {/* ikon tipe & centang saling crossfade dengan skala — tanpa remount */}
        <Icon className={cn("absolute size-3.5 transition-[opacity,transform] duration-200 ease-[var(--ease-out)]", done || pending ? "scale-50 opacity-0" : "scale-100 opacity-100")} />
        <Check className={cn("absolute size-4 transition-[opacity,transform] duration-200 ease-[var(--ease-out)]", done && !pending ? "scale-100 opacity-100" : "scale-50 opacity-0")} strokeWidth={3} />
        <Loader2 className={cn("absolute size-4 animate-spin transition-opacity duration-150", pending ? "opacity-100" : "opacity-0")} />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className={cn("text-[15px] font-medium leading-snug transition-colors duration-200", done && item.type === "tick" && "text-muted-foreground")}>
          <span className="tabular mr-1.5 text-muted-foreground">{index}.</span>
          {item.label}
        </p>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          {done && item.completedByName ? (
            <>
              {item.completedByName} · {fmtDateTime(item.response?.completedAt)}
            </>
          ) : (
            TYPE_HINT[item.type](item.unit)
          )}
        </p>
      </div>
      {!done && (
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none",
            item.required ? "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400" : "bg-foreground/[0.05] text-muted-foreground",
          )}
        >
          {item.required ? "Wajib" : "Opsional"}
        </span>
      )}
    </div>
  );

  if (item.type === "tick") {
    return (
      <button
        type="button"
        disabled={!editable || pending}
        onClick={() => save({ checked: !item.response?.checked })}
        aria-pressed={done}
        className={cn(
          cardClass(done),
          "block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
          editable ? "transition-[border-color,background-color,transform] active:scale-[0.99]" : "pointer-events-none",
          editable && !done && "hover:border-foreground/20",
          
        )}
      >
        {header}
      </button>
    );
  }

  return (
    <div className={cardClass(done)}>
      {header}
      <div className="mt-3 pl-[38px]">
        {item.type === "data" ? (
          editable ? (
            <TextInput
              value={value}
              suffix={item.unit ?? undefined}
              aria-label={item.label}
              inputMode={item.unit && item.unit !== "°C" ? "decimal" : "text"}
              onChange={(e) => {
                const v = e.target.value;
                setValue(v);
                if (timer.current) clearTimeout(timer.current);
                timer.current = setTimeout(() => flush(v), 800);
              }}
              onBlur={() => flush(value)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder="Isi nilai"
            />
          ) : (
            <div
              className={cn(
                "flex h-11 items-center justify-between gap-3 rounded-xl px-3.5",
                item.response?.value ? "bg-foreground/[0.035]" : "border border-dashed border-foreground/15 bg-foreground/[0.015]",
              )}
            >
              {item.response?.value ? (
                <span className="tabular text-[17px] font-semibold tracking-[-0.01em]">{item.response.value}</span>
              ) : (
                <span className="text-[13.5px] text-muted-foreground">Belum diisi</span>
              )}
              {item.unit && <span className="text-[13px] text-muted-foreground">{item.unit}</span>}
            </div>
          )
        ) : (
          <PhotoUploader photos={item.response?.photos ?? []} disabled={!editable} onChange={(photos) => save({ photos })} />
        )}
      </div>
    </div>
  );
}

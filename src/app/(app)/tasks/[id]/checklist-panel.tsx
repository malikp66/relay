"use client";

import { Check, Hash, Image as ImageIcon, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { notify } from "@/components/relay/notify";
import { saveChecklistResponseAction } from "@/app/actions/tasks";
import { PhotoUploader } from "@/components/relay/photo-uploader";
import { Input } from "@/components/ui/input";
import type { TaskDetail } from "@/server/queries";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Item = TaskDetail["items"][number];

export function isItemDone(i: Item) {
  const r = i.response;
  if (!r) return false;
  if (i.type === "tick") return !!r.checked;
  if (i.type === "data") return !!r.value?.trim();
  return (r.photos?.length ?? 0) > 0;
}

export function ChecklistPanel({ items, editable }: { items: Item[]; editable: boolean }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Checklist kosong.</p>;
  return (
    <div className="space-y-2.5">
      {!editable && <p className="text-xs text-muted-foreground">Mode lihat. Checklist hanya bisa diisi teknisi yang ditugaskan setelah check-in.</p>}
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
          <span className="mr-1 text-muted-foreground">{index}.</span>
          {item.label}
          {item.required ? <span className="ml-1 text-red-500">*</span> : <span className="ml-1.5 text-xs font-normal text-muted-foreground">opsional</span>}
        </p>
        {done && item.completedByName && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.completedByName} · {fmtDateTime(item.response?.completedAt)}
          </p>
        )}
      </div>
    </div>
  );

  if (item.type === "tick") {
    return (
      <button
        type="button"
        disabled={!editable || pending}
        onClick={() => save({ checked: !item.response?.checked })}
        data-selected={done}
        style={{ "--tint": "#10b981" } as CSSProperties}
        className={cn("card-interactive block w-full rounded-2xl p-4 outline-none", !editable && "pointer-events-none")}
      >
        {header}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] transition-[border-color,background-color] duration-200",
        done && "border-emerald-500/40 bg-[linear-gradient(180deg,color-mix(in_oklab,#10b981_7%,transparent),transparent_75%)]",
      )}
    >
      {header}
      <div className="mt-3 pl-10">
        {item.type === "data" ? (
          editable ? (
            <div className="relative">
              <Input
                value={value}
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
                className="h-12 rounded-xl pr-16 text-base"
              />
              {item.unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{item.unit}</span>}
            </div>
          ) : (
            <p className="tabular text-lg font-semibold">{item.response?.value ? `${item.response.value} ${item.unit ?? ""}` : <span className="text-sm font-normal text-muted-foreground">Belum diisi</span>}</p>
          )
        ) : (
          <PhotoUploader photos={item.response?.photos ?? []} disabled={!editable} onChange={(photos) => save({ photos })} />
        )}
      </div>
    </div>
  );
}

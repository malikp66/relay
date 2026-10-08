"use client";

import { Reorder, useDragControls } from "motion/react";
import { useMemo, useState, useTransition } from "react";
import { AlignLeft, ChevronDown, CircleDot, GripVertical, Hash, Loader2, Lock, Plus, Smartphone, ToggleRight, Trash2, Type, X, type LucideIcon } from "lucide-react";
import { saveReportTemplateAction } from "@/app/actions/admin";
import { BottomSheet } from "@/components/relay/bottom-sheet";
import { IphoneFrame } from "@/components/relay/iphone-frame";
import { Callout } from "@/components/relay/callout";
import { IconButton } from "@/components/relay/icon-button";
import { notify } from "@/components/relay/notify";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { ChipSelectTrigger, useQuietFocusReturn } from "@/components/relay/chip-select";
import { Switch } from "@/components/ui/switch";
import type { ReportField } from "@/db/schema";
import { cn } from "@/lib/utils";

export type ReportTpl = {
  id: string;
  name: string;
  categoryCode: string;
  categoryName: string;
  fields: ReportField[];
  version: number;
  updatedAt: string;
  editorName: string | null;
  reportCount: number;
};
type FieldType = ReportField["type"];
type Draft = { uid: string; key?: string; label: string; type: FieldType; required: boolean; options: string[]; placeholder: string };

export const FIELD_TYPES: Record<FieldType, { label: string; icon: LucideIcon; hint: string }> = {
  text: { label: "Teks singkat", icon: Type, hint: "Satu baris, mis. nomor seri" },
  textarea: { label: "Teks panjang", icon: AlignLeft, hint: "Beberapa baris, mis. kronologi" },
  number: { label: "Angka", icon: Hash, hint: "Nilai angka, mis. jumlah" },
  select: { label: "Pilihan", icon: CircleDot, hint: "Pilih salah satu opsi" },
  boolean: { label: "Ya / Tidak", icon: ToggleRight, hint: "Saklar ya atau tidak" },
};
const TYPE_ORDER: FieldType[] = ["text", "textarea", "number", "select", "boolean"];

let seq = 0;
const uid = () => `f${++seq}`;
const toDraft = (f: ReportField): Draft => ({ uid: uid(), key: f.key, label: f.label, type: f.type, required: f.required, options: f.options ?? [], placeholder: f.placeholder ?? "" });
const snapshot = (list: Draft[]) => JSON.stringify(list.map((f) => [f.key, f.label, f.type, f.required, f.options, f.placeholder]));

const fmtDate = (iso: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(iso));

export function ReportTemplateEditor({ tpl, canEdit }: { tpl: ReportTpl; canEdit: boolean }) {
  const initial = useMemo(() => tpl.fields.map(toDraft), [tpl.fields]);
  const [fields, setFields] = useState<Draft[]>(initial);
  const [baseline] = useState(() => snapshot(initial));
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const dirty = snapshot(fields) !== baseline;
  const required = fields.filter((f) => f.required).length + 1;

  const update = (id: string, patch: Partial<Draft>) => setFields((list) => list.map((f) => (f.uid === id ? { ...f, ...patch } : f)));
  const move = (id: string, d: -1 | 1) =>
    setFields((list) => {
      const i = list.findIndex((f) => f.uid === id);
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const problems = fields.flatMap((f, i) => [
    ...(!f.label.trim() ? [`Field ${i + 1} belum punya label`] : []),
    ...(f.type === "select" && new Set(f.options).size < 2 ? [`"${f.label || `Field ${i + 1}`}" butuh minimal 2 opsi`] : []),
  ]);

  const add = () => {
    if (!label.trim()) return;
    setFields((list) => [...list, { uid: uid(), label: label.trim(), type, required: true, options: [], placeholder: "" }]);
    setLabel("");
  };

  const save = () => {
    if (problems.length) return notify.error(problems[0]);
    start(async () => {
      const res = await saveReportTemplateAction(
        tpl.id,
        fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required, options: f.type === "select" ? f.options : undefined, placeholder: f.placeholder || undefined })),
        tpl.version,
      );
      if (res.ok) notify.success(`Tersimpan sebagai versi ${res.version}`, { description: "Berlaku untuk laporan baru. Laporan yang sudah dibuat tetap memakai versi lamanya." });
      else notify.error(res.error);
    });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-3">
        {!canEdit && (
          <Callout tone="info" title="Mode lihat">
            Hanya Admin yang bisa mengubah template laporan.
          </Callout>
        )}
        <section className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
          <header className="flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
                {tpl.name}
                <span className="tabular rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">v{tpl.version}</span>
              </p>
              <p className="tabular mt-0.5 text-[12.5px] text-muted-foreground">
                {fields.length + 1} field · {required} wajib · dipakai di {tpl.reportCount} laporan
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground/80">
                Diubah {fmtDate(tpl.updatedAt)}
                {tpl.editorName ? ` oleh ${tpl.editorName}` : ""}
              </p>
            </div>
            <BottomSheet
              title="Tampilan di HP teknisi"
              description="Seperti ini form laporan yang diisi teknisi."
              trigger={
                <button type="button" className="press flex h-8 shrink-0 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-[12.5px] font-medium transition-colors hover:bg-foreground/[0.04] lg:hidden">
                  <Smartphone className="size-3.5" /> Lihat di HP
                </button>
              }
            >
              <ReportPreview fields={fields} />
            </BottomSheet>
          </header>

          <Reorder.Group data-tour="rpt-fields" as="ol" axis="y" values={fields} onReorder={canEdit ? setFields : () => {}} className="relative">
            {fields.map((f, i) => (
              <FieldRow key={f.uid} field={f} index={i} count={fields.length} canEdit={canEdit} onChange={(p) => update(f.uid, p)} onMove={(d) => move(f.uid, d)} onRemove={() => setFields((l) => l.filter((x) => x.uid !== f.uid))} />
            ))}
          </Reorder.Group>

          {/* field bawaan: selalu ada di setiap laporan */}
          <div className="flex items-center gap-2 border-t bg-foreground/[0.015] py-2.5 pl-1.5 pr-3 sm:pr-4">
            <span className="flex h-9 w-7 shrink-0 items-center justify-center text-muted-foreground/50">
              <Lock className="size-3.5" />
            </span>
            <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-[12px] font-semibold text-muted-foreground">{fields.length + 1}</span>
            <div className="min-w-0 flex-1 pl-1.5">
              <p className="truncate text-[14px] font-medium">Temuan / catatan akhir</p>
              <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <AlignLeft className="size-3" /> Teks panjang · selalu ada di setiap laporan
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">Bawaan · Wajib</span>
          </div>

          {canEdit && (
            <form
              data-tour="rpt-add"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
              className="border-t px-3 py-3 sm:px-4"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-foreground/20 text-muted-foreground">
                  <Plus className="size-4" />
                </span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={80}
                  placeholder="Tambah field, mis. Nomor seri ONT"
                  className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-[14px]"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-10">
                <TypeSelect value={type} onChange={setType} />
                <button type="submit" disabled={!label.trim()} className="press ml-auto flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[12.5px] font-medium text-background transition-opacity duration-150 disabled:opacity-30">
                  Tambah
                  <kbd className="hidden font-sans text-[11px] opacity-60 sm:inline">↵</kbd>
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      <aside data-tour="rpt-preview" className="sticky top-20 hidden lg:block">
        <p className="mb-3 px-1">
          <span className="flex items-center gap-1.5 text-[13px] font-medium">
            <Smartphone className="size-3.5 text-muted-foreground" /> Tampilan di HP teknisi
          </span>
          <span className="mt-0.5 block text-[12px] text-muted-foreground">Ikut berubah saat kamu mengedit.</span>
        </p>
        <IphoneFrame className="mx-auto max-w-[290px]">
          <ReportPreview fields={fields} />
        </IphoneFrame>
      </aside>

      {/* bar simpan: muncul hanya saat ada perubahan */}
      <div
        aria-hidden={!dirty}
        className={cn(
          "pb-safe fixed inset-x-0 bottom-16 z-30 border-t border-foreground/[0.06] bg-background/90 px-4 py-3 backdrop-blur-xl transition-[transform,opacity] duration-200 ease-[var(--ease-out)] lg:bottom-0 lg:left-[248px]",
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3 lg:px-4">
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium">Perubahan belum disimpan</p>
            <p className="truncate text-[12px] text-muted-foreground">{problems.length ? problems[0] : `Akan disimpan sebagai versi ${tpl.version + 1}`}</p>
          </div>
          <button type="button" disabled={pending} onClick={() => setFields(initial.map((f) => ({ ...f })))} className="press h-10 shrink-0 rounded-xl border bg-card px-3.5 text-[13px] font-medium hover:bg-foreground/[0.04]">
            Batalkan
          </button>
          <button type="button" disabled={pending} onClick={save} className="press flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-medium text-primary-foreground disabled:opacity-60">
            {pending && <Loader2 className="size-3.5 animate-spin" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeSelect({ value, onChange, disabled }: { value: FieldType; onChange: (t: FieldType) => void; disabled?: boolean }) {
  const meta = FIELD_TYPES[value];
  const quiet = useQuietFocusReturn();
  return (
    <Select value={value} onValueChange={(v) => onChange(v as FieldType)} disabled={disabled}>
      <ChipSelectTrigger {...quiet.triggerProps} aria-label="Tipe field" className="h-8 min-h-8! w-auto shrink-0 gap-1.5 rounded-lg px-2.5 text-[12px]">
        <meta.icon className="size-3.5" />
        <span className="font-medium">{meta.label}</span>
        {!disabled && <ChevronDown className="size-3.5 opacity-60" />}
      </ChipSelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={6} className="min-w-60" onCloseAutoFocus={quiet.onCloseAutoFocus}>
        {TYPE_ORDER.map((t) => {
          const m = FIELD_TYPES[t];
          return (
            <SelectItem key={t} value={t}>
              <span className="flex items-center gap-2.5">
                <m.icon className="size-4 text-muted-foreground" />
                <span>
                  <span className="block text-[13px] font-medium">{m.label}</span>
                  <span className="block text-[11.5px] text-muted-foreground">{m.hint}</span>
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function FieldRow({ field, index, count, canEdit, onChange, onMove, onRemove }: { field: Draft; index: number; count: number; canEdit: boolean; onChange: (p: Partial<Draft>) => void; onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const [opt, setOpt] = useState("");
  const addOpt = () => {
    const v = opt.trim();
    if (!v) return;
    if (!field.options.includes(v)) onChange({ options: [...field.options, v] });
    setOpt("");
  };
  const meta = FIELD_TYPES[field.type];
  const showExtra = canEdit || field.type === "select";

  return (
    <Reorder.Item
      as="li"
      value={field}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      whileDrag={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 600, damping: 45 }}
      className={cn("relative border-b bg-card py-2 pl-1.5 pr-2 last:border-b-0 sm:pr-3", dragging && "z-10 rounded-xl border-transparent shadow-[var(--shadow-pop)] ring-1 ring-foreground/10")}
    >
      <div className="flex items-center gap-1 sm:gap-2">
        {canEdit ? (
          <button
            type="button"
            aria-label={`Ubah urutan ${field.label}. Seret, atau tekan panah atas/bawah`}
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                onMove(-1);
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                onMove(1);
              }
            }}
            className={cn("flex h-9 w-7 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground/60 outline-none transition-colors duration-150 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50", dragging ? "cursor-grabbing" : "cursor-grab")}
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          <span className="w-7 shrink-0" />
        )}
        <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-[12px] font-semibold text-muted-foreground">{index + 1}</span>
        <div className="min-w-0 flex-1 pl-1.5">
          <input
            value={field.label}
            readOnly={!canEdit}
            maxLength={80}
            onChange={(e) => onChange({ label: e.target.value })}
            aria-label="Label field"
            placeholder="Label field"
            className={cn(
              "-mx-1.5 block h-7 w-[calc(100%+12px)] truncate rounded-md bg-transparent px-1.5 text-[14px] font-medium outline-none transition-colors duration-150",
              canEdit && "hover:bg-foreground/[0.04] focus:bg-foreground/[0.05]",
              !field.label.trim() && "ring-1 ring-amber-500/50",
            )}
          />
          {!canEdit && (
            <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <meta.icon className="size-3" /> {meta.label}
            </p>
          )}
        </div>
        <label className={cn("flex shrink-0 items-center gap-2 pl-1 text-[12px] text-muted-foreground", canEdit && "cursor-pointer")}>
          <span className={cn("hidden sm:inline", field.required && "text-foreground")}>{field.required ? "Wajib" : "Opsional"}</span>
          <Switch checked={field.required} disabled={!canEdit} aria-label="Wajib" onCheckedChange={(c) => onChange({ required: c })} />
        </label>
        {canEdit && <IconButton icon={Trash2} label="Hapus field" className="ml-1 hover:bg-red-500/10 hover:text-red-600" onClick={onRemove} />}
        <span className="sr-only">
          {index + 1} dari {count}
        </span>
      </div>

      {showExtra && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[66px] sm:pl-[72px]">
          {canEdit && <TypeSelect value={field.type} onChange={(t) => onChange({ type: t })} />}
          {field.type === "select" ? (
            <>
              {field.options.map((o) => (
                <span key={o} className="flex h-7 items-center gap-1 rounded-lg border bg-background pl-2.5 pr-1 text-[12px]">
                  {o}
                  {canEdit && (
                    <button type="button" aria-label={`Hapus opsi ${o}`} onClick={() => onChange({ options: field.options.filter((x) => x !== o) })} className="flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))}
              {canEdit && (
                <input
                  value={opt}
                  maxLength={40}
                  onChange={(e) => setOpt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOpt();
                    }
                  }}
                  onBlur={addOpt}
                  placeholder={field.options.length ? "+ opsi" : "Ketik opsi lalu Enter"}
                  className="h-7 w-32 rounded-lg border border-dashed bg-transparent px-2.5 text-[12px] outline-none placeholder:text-muted-foreground focus:border-ring"
                />
              )}
              {field.options.length < 2 && <span className="text-[11.5px] text-amber-700 dark:text-amber-400">Minimal 2 opsi</span>}
            </>
          ) : field.type !== "boolean" ? (
            <input
              value={field.placeholder}
              maxLength={80}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              placeholder="Petunjuk isian (opsional)"
              className="h-7 min-w-0 flex-1 rounded-lg border border-dashed bg-transparent px-2.5 text-[12px] outline-none placeholder:text-muted-foreground focus:border-solid focus:border-ring sm:max-w-72"
            />
          ) : null}
        </div>
      )}
    </Reorder.Item>
  );
}

/* Proporsi sama dengan form laporan asli (report-panel): kotak satu baris, teks panjang lebih tinggi, pilihan bersekat. */
const PBOX = "rounded-lg border border-input bg-background px-2.5 text-[11.5px] text-muted-foreground/80 dark:bg-input/30";

/** Form laporan versi teknisi (statis) — gaya sama dengan tab Laporan di halaman task. */
function ReportPreview({ fields }: { fields: Draft[] }) {
  const all = [...fields, { uid: "__findings", label: "Temuan / catatan akhir", type: "textarea" as const, required: true, options: [], placeholder: "Ringkasan hasil pekerjaan dan hal yang perlu diperhatikan." }];
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-3.5 shadow-[var(--shadow-card)]">
      {all.map((f) => (
        <div key={f.uid} className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[12.5px] font-medium">
            <span className="min-w-0 truncate">{f.label || "Tanpa label"}</span>
            {f.required && <span className="shrink-0 rounded bg-amber-500/10 px-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">Wajib</span>}
          </p>
          {f.type === "textarea" ? (
            <div className={cn(PBOX, "h-[76px] py-2 leading-relaxed")}>{f.placeholder}</div>
          ) : f.type === "boolean" || f.type === "select" ? (
            <div className={cn("grid gap-1.5", f.type === "boolean" ? "grid-cols-2" : "grid-cols-1")}>
              {(f.type === "boolean" ? ["Ya", "Tidak"] : f.options.length ? f.options : ["Opsi 1", "Opsi 2"]).map((o) => (
                <span key={o} className={cn(PBOX, "flex min-h-9 items-center gap-1.5 py-1.5 leading-tight", f.type === "select" && !f.options.length && "border-dashed")}>
                  <span className="size-3 shrink-0 rounded-full border border-foreground/25" />
                  <span className="min-w-0 break-words">{o}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className={cn(PBOX, "flex h-9 items-center", f.type === "number" && "tabular")}>{f.placeholder || (f.type === "number" ? "0" : "")}</div>
          )}
        </div>
      ))}
    </div>
  );
}

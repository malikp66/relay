"use client";

import { Reorder, useDragControls } from "motion/react";
import { useRef, useState, useTransition } from "react";
import { CalendarClock, Camera, Check, FileText, GripVertical, Hash, Image as ImageIcon, ListChecks, Loader2, Plus, Smartphone, Trash2, Wrench } from "lucide-react";
import { BottomSheet } from "@/components/relay/bottom-sheet";
import { IphoneFrame } from "@/components/relay/iphone-frame";
import { UnitSelect } from "@/components/relay/unit-select";
import { notify } from "@/components/relay/notify";
import { addTemplateItemAction, deleteTemplateItemAction, reorderTemplateItemsAction, updateTemplateItemAction } from "@/app/actions/admin";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { Segmented } from "@/components/relay/segmented";
import { Section } from "@/components/relay/page";
import { IconButton } from "@/components/relay/icon-button";
import { Switch } from "@/components/ui/switch";
import { ReportTemplateEditor, type ReportTpl } from "./report-editor";
import { ProductIcon } from "@/lib/product-icons";
import { cn } from "@/lib/utils";

type ItemType = "tick" | "data" | "photo";
type TplItem = { id: string; label: string; type: ItemType; unit: string | null; required: boolean };
type Tpl = { id: string; name: string; categoryCode: string; productName: string; productIcon: string | null; items: TplItem[] };
const TYPE_ICON = { tick: Check, data: Hash, photo: ImageIcon };
const TYPE_LABEL = { tick: "Centang", data: "Data", photo: "Foto" };
const ITEM_TYPES = [
  { id: "tick", label: "Centang", icon: Check },
  { id: "data", label: "Data", icon: Hash },
  { id: "photo", label: "Foto", icon: ImageIcon },
] as const;
const CATS = [
  { code: "TS", label: "Troubleshoot", icon: Wrench },
  { code: "MT", label: "Maintenance", icon: CalendarClock },
] as const;

/** Pilih kategori — segmen dengan ikon (dipakai di tab Checklist & Laporan). */
function CategorySwitch({ value, onChange, counts }: { value: string; onChange: (c: string) => void; counts?: Record<string, number> }) {
  return (
    <div role="tablist" aria-label="Kategori" className="inline-flex rounded-xl bg-foreground/[0.05] p-[3px]">
      {CATS.map((c) => {
        const on = value === c.code;
        return (
          <button
            key={c.code}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(c.code)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150",
              on ? "bg-background text-foreground shadow-[0_1px_2px_rgb(16_24_40/0.08),0_0_0_0.5px_rgb(16_24_40/0.06)] dark:bg-white/[0.11] dark:shadow-none" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <c.icon className={cn("size-3.5", on ? "text-primary" : "")} />
            {c.label}
            {counts ? <span className={cn("tabular text-[11.5px]", on ? "text-muted-foreground" : "text-muted-foreground/70")}>{counts[c.code] ?? 0}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TemplatesView({ templates, reportTemplates, canEditReport }: { templates: Tpl[]; reportTemplates: ReportTpl[]; canEditReport: boolean }) {
  const [mode, setMode] = useState("checklist");
  const [cat, setCat] = useState("TS");
  const [selected, setSelected] = useState<string>(templates.find((t) => t.categoryCode === "TS")?.id ?? templates[0]?.id ?? "");
  const tpl = templates.find((t) => t.id === selected);
  const report = reportTemplates.find((r) => r.categoryCode === cat);
  const catCounts = Object.fromEntries(CATS.map((c) => [c.code, templates.filter((t) => t.categoryCode === c.code).length]));
  const catLabel = CATS.find((c) => c.code === cat)?.label ?? "";

  return (
    <div className="space-y-8">
      <div data-tour="tpl-mode">
        <SmoothTabs
          value={mode}
          onChange={setMode}
          items={[
            { id: "checklist", label: "Checklist", icon: ListChecks, badge: templates.length },
            { id: "report", label: "Laporan", icon: FileText, badge: reportTemplates.length },
          ]}
        />
      </div>
      {mode === "checklist" ? (
        <>
          <Section
            tour="tpl-products"
            title="Pilih template"
            description="Satu checklist untuk setiap kombinasi kategori dan produk. Checklist otomatis dipakai saat task baru dibuat."
          >
            <CategorySwitch
              value={cat}
              counts={catCounts}
              onChange={(c) => {
                setCat(c);
                setSelected(templates.find((t) => t.categoryCode === c)?.id ?? "");
              }}
            />
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 sm:[mask-image:none]">
              {templates
                .filter((t) => t.categoryCode === cat)
                .map((t) => {
                  const on = selected === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setSelected(t.id)} aria-pressed={on} className="chip h-9 shrink-0 gap-1.5 pl-3 pr-1.5">
                      <ProductIcon id={t.productIcon} className="size-4 opacity-70" />
                      {t.productName}
                      <span
                        className={cn(
                          "tabular ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold transition-colors duration-150",
                          on ? "bg-primary text-primary-foreground" : "bg-foreground/[0.07] text-muted-foreground",
                        )}
                      >
                        {t.items.length}
                      </span>
                    </button>
                  );
                })}
            </div>
          </Section>
          {/* remount saat data server berubah → state lokal selalu sinkron setelah revalidate */}
          {tpl && (
            <Section title="Isi checklist" description="Perubahan langsung tersimpan dan hanya berlaku untuk task baru. Seret ⠿ untuk mengubah urutan, klik label untuk mengganti teks.">
              <TemplateEditor key={`${tpl.id}:${tpl.items.map((i) => `${i.id}${i.label}${i.required ? 1 : 0}`).join("|")}`} tpl={tpl} categoryName={catLabel} />
            </Section>
          )}
        </>
      ) : (
        <>
          <Section tour="rpt-category" title="Pilih kategori" description="Satu form laporan untuk setiap kategori. Teknisi mengisinya setelah Job Done, lalu supervisor mereview.">
            <CategorySwitch value={cat} onChange={setCat} />
          </Section>
          <Section
            title="Field laporan"
            description={canEditReport ? "Ubah field lalu tekan Simpan untuk membuat versi baru. Laporan yang sudah dibuat tetap memakai versi lamanya." : "Daftar field yang diisi teknisi di laporan kategori ini."}
          >
            {report ? (
              <ReportTemplateEditor key={`${report.id}:v${report.version}`} tpl={report} canEdit={canEditReport} />
            ) : (
              <p className="rounded-2xl border border-dashed px-6 py-10 text-center text-[13px] text-muted-foreground">Belum ada template laporan untuk kategori {catLabel}.</p>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function TemplateEditor({ tpl, categoryName }: { tpl: Tpl; categoryName: string }) {
  const [pending, start] = useTransition();
  const [items, setItems] = useState(tpl.items);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ItemType>("tick");
  const [unit, setUnit] = useState("");
  const saved = useRef(tpl.items.map((i) => i.id).join());

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg?: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) notify.error(r.error);
      else if (msg) notify.success(msg);
    });

  const persistOrder = (next: TplItem[]) => {
    const ids = next.map((i) => i.id);
    if (ids.join() === saved.current) return;
    saved.current = ids.join();
    run(() => reorderTemplateItemsAction(tpl.id, ids), "Urutan disimpan");
  };
  const moveBy = (id: string, d: -1 | 1) => {
    const i = items.findIndex((x) => x.id === id);
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    persistOrder(next);
  };
  const add = () => {
    if (!label.trim()) return;
    run(() => addTemplateItemAction(tpl.id, { label, type, unit, required: true }), "Item ditambahkan");
  };

  const required = items.filter((i) => i.required).length;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
    <section className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
            {tpl.productName} <span className="font-normal text-muted-foreground">· {categoryName}</span>
          </p>
          <p className="tabular mt-0.5 text-[12.5px] text-muted-foreground">
            {items.length} item · {required} wajib
          </p>
        </div>
        <span className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1.5 text-[12px] text-muted-foreground transition-opacity duration-150", pending ? "opacity-100" : "opacity-0")}>
            <Loader2 className="size-3.5 animate-spin" /> <span className="hidden sm:inline">Menyimpan</span>
          </span>
          <BottomSheet
            title="Tampilan di HP teknisi"
            description={`${tpl.productName} · ${categoryName}. Seperti ini yang dilihat teknisi di lokasi.`}
            trigger={
              <button type="button" data-tour="tpl-preview" className="press flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-[12.5px] font-medium transition-colors hover:bg-foreground/[0.04] lg:hidden">
                <Smartphone className="size-3.5" /> Lihat di HP
              </button>
            }
          >
            <ChecklistPreview items={items} />
          </BottomSheet>
        </span>
      </header>

      {items.length ? (
        <Reorder.Group data-tour="tpl-items" as="ol" axis="y" values={items} onReorder={setItems} className="relative">
          {items.map((it, i) => (
            <Row key={it.id} item={it} index={i} count={items.length} onDrop={() => persistOrder(items)} onMove={(d) => moveBy(it.id, d)} run={run} />
          ))}
        </Reorder.Group>
      ) : (
        <p data-tour="tpl-items" className="px-5 py-8 text-center text-[13px] text-muted-foreground">
          Belum ada item. Tambahkan item pertama di bawah.
        </p>
      )}

      {/* Tambah item: menyatu di kaki kartu */}
      <form
        data-tour="tpl-add"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="border-t bg-foreground/[0.015] px-3 py-3 sm:px-4"
      >
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-foreground/20 text-muted-foreground">
            <Plus className="size-4" />
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Tambah item, mis. Foto label ODP"
            className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-[14px]"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-10">
          <Segmented label="Tipe item" options={ITEM_TYPES} value={type} onChange={setType} />
          {type === "data" && <UnitSelect value={unit} onChange={setUnit} />}
          <button
            type="submit"
            disabled={!label.trim() || pending}
            className="press ml-auto flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[12.5px] font-medium text-background transition-opacity duration-150 disabled:opacity-30"
          >
            Tambah
            <kbd className="hidden font-sans text-[11px] opacity-60 sm:inline">↵</kbd>
          </button>
        </div>
      </form>
    </section>

    {/* Tampilan di HP teknisi (desktop): ikut berubah saat item diseret/diubah */}
    <aside data-tour="tpl-preview" className="sticky top-20 hidden lg:block">
      <p className="mb-3 px-1">
        <span className="flex items-center gap-1.5 text-[13px] font-medium">
          <Smartphone className="size-3.5 text-muted-foreground" /> Tampilan di HP teknisi
        </span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">Ikut berubah saat kamu mengedit.</span>
      </p>
      <IphoneFrame className="mx-auto max-w-[290px]">
        <ChecklistPreview items={items} compact />
      </IphoneFrame>
    </aside>
    </div>
  );
}

const PREVIEW_HINT: Record<ItemType, (unit: string | null) => string> = {
  tick: () => "Centang bila sudah dikerjakan",
  data: (unit) => `Isi data${unit ? ` · ${unit}` : ""}`,
  photo: () => "Foto bukti",
};

/** Tampilan checklist versi teknisi (sama gaya dengan halaman task) — statis, untuk pratinjau template. */
function ChecklistPreview({ items, compact }: { items: TplItem[]; compact?: boolean }) {
  const required = items.filter((i) => i.required).length;
  return (
    <div className={cn("space-y-2", compact ? "text-[0.94em]" : "pb-2")}>
      <div className="rounded-2xl border bg-card px-3.5 py-3 shadow-[var(--shadow-card)]">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[13.5px] font-semibold">
            <span className="tabular">0</span> dari <span className="tabular">{items.length}</span> selesai
          </p>
          <p className="text-[11.5px] font-medium text-amber-600 dark:text-amber-400">{required} item wajib</p>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-foreground/[0.07]" />
      </div>
      {items.map((it, i) => {
        const Icon = TYPE_ICON[it.type];
        return (
          <div key={it.id} className="rounded-2xl border bg-card p-3.5 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[7px] border border-foreground/20 bg-background text-muted-foreground">
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-snug">
                  <span className="tabular mr-1 text-muted-foreground">{i + 1}.</span>
                  {it.label}
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{PREVIEW_HINT[it.type](it.unit)}</p>
              </div>
              <span className={cn("mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium leading-none", it.required ? "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400" : "bg-foreground/[0.05] text-muted-foreground")}>
                {it.required ? "Wajib" : "Opsional"}
              </span>
            </div>
            {it.type === "data" && (
              <div className="mt-2.5 flex h-10 items-center justify-between rounded-xl border bg-background pl-[34px] pr-3 text-[13px] text-muted-foreground">
                Isi nilai
                {it.unit && <span>{it.unit}</span>}
              </div>
            )}
            {it.type === "photo" && (
              <div className="mt-2.5 ml-[34px] flex size-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-foreground/20 text-[10.5px] text-muted-foreground">
                <Camera className="size-4" />
                Foto
              </div>
            )}
          </div>
        );
      })}
      {!items.length && <p className="py-6 text-center text-[12.5px] text-muted-foreground">Checklist masih kosong.</p>}
    </div>
  );
}

function Row({
  item,
  index,
  count,
  onDrop,
  onMove,
  run,
}: {
  item: TplItem;
  index: number;
  count: number;
  onDrop: () => void;
  onMove: (d: -1 | 1) => void;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, msg?: string) => void;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState(item.label);
  const cancelled = useRef(false);
  const Icon = TYPE_ICON[item.type];
  const saveLabel = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const v = text.trim();
    if (!v) return setText(item.label);
    if (v !== item.label) run(() => updateTemplateItemAction(item.id, { label: v }), "Label diperbarui");
  };

  return (
    <Reorder.Item
      as="li"
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false);
        onDrop();
      }}
      whileDrag={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 600, damping: 45 }}
      className={cn(
        "relative flex items-center gap-1 border-b bg-card py-2 pl-1.5 pr-2 last:border-b-0 sm:gap-2 sm:pr-3",
        dragging && "z-10 rounded-xl border-transparent shadow-[var(--shadow-pop)] ring-1 ring-foreground/10",
      )}
    >
      {/* pegangan seret: juga bisa dengan keyboard (↑/↓) */}
      <button
        type="button"
        aria-label={`Ubah urutan ${item.label}. Seret, atau tekan panah atas/bawah`}
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
        className={cn("flex h-9 w-7 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground/60 outline-none transition-colors duration-150 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50", dragging ? "cursor-grabbing text-foreground" : "cursor-grab")}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-[12px] font-semibold text-muted-foreground">{index + 1}</span>

      <div className="min-w-0 flex-1 pl-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              cancelled.current = true;
              setText(item.label);
              e.currentTarget.blur();
            }
          }}
          aria-label="Label item"
          className="-mx-1.5 block h-7 w-[calc(100%+12px)] truncate rounded-md bg-transparent px-1.5 text-[14px] font-medium outline-none transition-colors duration-150 hover:bg-foreground/[0.04] focus:bg-foreground/[0.05]"
        />
        <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <Icon className="size-3" />
          {TYPE_LABEL[item.type]}
          {item.unit ? <span className="font-mono text-[11px]">· {item.unit}</span> : null}
        </p>
      </div>

      <label className="flex shrink-0 cursor-pointer items-center gap-2 pl-1 text-[12px] text-muted-foreground">
        <span className={cn("hidden sm:inline", item.required && "text-foreground")}>{item.required ? "Wajib" : "Opsional"}</span>
        <Switch checked={item.required} aria-label="Wajib" onCheckedChange={(c) => run(() => updateTemplateItemAction(item.id, { required: c }))} />
      </label>
      <IconButton icon={Trash2} label="Hapus item" className="ml-1 hover:bg-red-500/10 hover:text-red-600" onClick={() => run(() => deleteTemplateItemAction(item.id), "Item dihapus")} />
      <span className="sr-only">
        {index + 1} dari {count}
      </span>
    </Reorder.Item>
  );
}

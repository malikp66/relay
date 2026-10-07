"use client";

import { Reorder, useDragControls } from "motion/react";
import { useRef, useState, useTransition } from "react";
import { Camera, Check, Eye, GripVertical, Hash, Image as ImageIcon, Loader2, Plus, Smartphone, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/relay/bottom-sheet";
import { UnitSelect } from "@/components/relay/unit-select";
import { notify } from "@/components/relay/notify";
import { addTemplateItemAction, deleteTemplateItemAction, reorderTemplateItemsAction, updateTemplateItemAction } from "@/app/actions/admin";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { IconButton } from "@/components/relay/icon-button";
import { Switch } from "@/components/ui/switch";
import type { ReportField } from "@/db/schema";
import { cn } from "@/lib/utils";

type ItemType = "tick" | "data" | "photo";
type TplItem = { id: string; label: string; type: ItemType; unit: string | null; required: boolean };
type Tpl = { id: string; name: string; categoryCode: string; productName: string; items: TplItem[] };
const TYPE_ICON = { tick: Check, data: Hash, photo: ImageIcon };
const TYPE_LABEL = { tick: "Centang", data: "Data", photo: "Foto" };
const CATS = [
  ["TS", "Troubleshoot"],
  ["MT", "Maintenance"],
] as const;

export function TemplatesView({ templates, reportTemplates }: { templates: Tpl[]; reportTemplates: { id: string; name: string; fields: ReportField[] }[]; canEditReport: boolean }) {
  const [mode, setMode] = useState("checklist");
  const [cat, setCat] = useState("TS");
  const [selected, setSelected] = useState<string>(templates.find((t) => t.categoryCode === "TS")?.id ?? templates[0]?.id ?? "");
  const tpl = templates.find((t) => t.id === selected);

  return (
    <div className="space-y-5">
      <div data-tour="tpl-mode">
        <SmoothTabs
          value={mode}
          onChange={setMode}
          items={[
            { id: "checklist", label: "Checklist" },
            { id: "report", label: "Laporan" },
          ]}
        />
      </div>
      {mode === "checklist" ? (
        <>
          <div data-tour="tpl-products" className="space-y-3">
            <div className="inline-flex rounded-xl bg-foreground/[0.05] p-1">
              {CATS.map(([c, l]) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCat(c);
                    setSelected(templates.find((t) => t.categoryCode === c)?.id ?? "");
                  }}
                  className={cn(
                    "h-8 rounded-lg px-3.5 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150",
                    cat === c ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)] dark:bg-white/10" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 sm:[mask-image:none]">
              {templates
                .filter((t) => t.categoryCode === cat)
                .map((t) => (
                  <button key={t.id} type="button" onClick={() => setSelected(t.id)} aria-pressed={selected === t.id} className="chip h-9 shrink-0 gap-2 pr-2">
                    {t.productName}
                    <span className="tabular rounded-md bg-foreground/[0.06] px-1.5 text-[11.5px] font-medium leading-5 text-muted-foreground">{t.items.length}</span>
                  </button>
                ))}
            </div>
          </div>
          {/* remount saat data server berubah → state lokal selalu sinkron setelah revalidate */}
          {tpl && <TemplateEditor key={`${tpl.id}:${tpl.items.map((i) => `${i.id}${i.label}${i.required ? 1 : 0}`).join("|")}`} tpl={tpl} categoryName={CATS.find(([c]) => c === cat)?.[1] ?? ""} />}
        </>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reportTemplates.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
              <p className="border-b px-4 py-3 text-[14px] font-semibold">{r.name}</p>
              <ol className="divide-y">
                {r.fields.map((f, i) => (
                  <li key={f.key} className="flex items-center gap-3 px-4 py-2.5 text-[13.5px]">
                    <span className="tabular w-4 text-right text-[12px] text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{f.label}</span>
                    {f.required && <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">Wajib</span>}
                    <span className="rounded-md bg-foreground/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{f.type}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <p className="text-[12.5px] text-muted-foreground md:col-span-2">Editor template laporan dijadwalkan setelah go-live (RLY-103). Untuk sekarang, perubahan field laporan dilakukan lewat developer.</p>
        </div>
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
            title="Pratinjau di HP teknisi"
            description={`${tpl.productName} · ${categoryName}`}
            trigger={
              <button type="button" data-tour="tpl-preview" className="press flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-[12.5px] font-medium transition-colors hover:bg-foreground/[0.04] lg:hidden">
                <Eye className="size-3.5" /> Pratinjau
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

      {/* Tambah item — menyatu di kaki kartu */}
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
          <div className="flex rounded-lg bg-foreground/[0.05] p-0.5">
            {(["tick", "data", "photo"] as const).map((t) => {
              const Icon = TYPE_ICON[t];
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium transition-[color,background-color,box-shadow] duration-150",
                    type === t ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)] dark:bg-white/10" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" /> {TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>
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

    {/* Pratinjau langsung (desktop) — ikut berubah saat item diseret/diubah */}
    <aside data-tour="tpl-preview" className="sticky top-20 hidden lg:block">
      <p className="mb-2 flex items-center gap-1.5 px-1 text-[12.5px] font-medium text-muted-foreground">
        <Smartphone className="size-3.5" /> Pratinjau di HP teknisi
      </p>
      <div className="rounded-[30px] border bg-zinc-100 p-2 shadow-[var(--shadow-card)] dark:bg-white/[0.04]">
        <div className="max-h-[560px] overflow-y-auto rounded-[24px] border bg-background p-3 [scrollbar-width:none]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/10" />
          <ChecklistPreview items={items} compact />
        </div>
      </div>
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
      {/* pegangan seret — juga bisa dengan keyboard (↑/↓) */}
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

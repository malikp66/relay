"use client";

import { useState, useTransition } from "react";
import { notify } from "@/components/relay/notify";
import { ArrowDown, ArrowUp, Check, Hash, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { addTemplateItemAction, deleteTemplateItemAction, moveTemplateItemAction, updateTemplateItemAction } from "@/app/actions/admin";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/relay/icon-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ReportField } from "@/db/schema";
import { cn } from "@/lib/utils";

type Tpl = { id: string; name: string; categoryCode: string; productName: string; items: { id: string; label: string; type: "tick" | "data" | "photo"; unit: string | null; required: boolean }[] };
const TYPE_ICON = { tick: Check, data: Hash, photo: ImageIcon };
const TYPE_LABEL = { tick: "Centang", data: "Data", photo: "Foto" };

export function TemplatesView({ templates, reportTemplates }: { templates: Tpl[]; reportTemplates: { id: string; name: string; fields: ReportField[] }[]; canEditReport: boolean }) {
  const [mode, setMode] = useState("checklist");
  const [cat, setCat] = useState("TS");
  const [selected, setSelected] = useState<string>(templates.find((t) => t.categoryCode === "TS")?.id ?? templates[0]?.id ?? "");
  const tpl = templates.find((t) => t.id === selected);

  return (
    <div className="space-y-4">
      <SmoothTabs
        value={mode}
        onChange={setMode}
        items={[
          { id: "checklist", label: "Checklist" },
          { id: "report", label: "Laporan" },
        ]}
      />
      {mode === "checklist" ? (
        <>
          <div className="flex gap-2">
            {[
              ["TS", "Troubleshoot"],
              ["MT", "Maintenance"],
            ].map(([c, l]) => (
              <button
                key={c}
                onClick={() => {
                  setCat(c);
                  setSelected(templates.find((t) => t.categoryCode === c)?.id ?? "");
                }}
                aria-pressed={cat === c}
                className="chip"
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {templates
              .filter((t) => t.categoryCode === cat)
              .map((t) => (
                <button key={t.id} onClick={() => setSelected(t.id)} aria-pressed={selected === t.id} className="card-interactive shrink-0 rounded-xl px-3.5 py-2.5 text-left text-sm">
                  <span className="font-medium">{t.productName}</span>
                  <span className="block text-xs text-muted-foreground">{t.items.length} item</span>
                </button>
              ))}
          </div>
          {tpl && <TemplateEditor key={tpl.id} tpl={tpl} />}
        </>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reportTemplates.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-4">
              <p className="font-semibold">{r.name}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {r.fields.map((f) => (
                  <li key={f.key} className="flex items-center justify-between gap-2">
                    <span>
                      {f.label}
                      {f.required && <span className="text-red-500">*</span>}
                    </span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{f.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted-foreground md:col-span-2">Editor template laporan dijadwalkan setelah go-live (RLY-103). Untuk sekarang, perubahan field laporan dilakukan lewat developer.</p>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ tpl }: { tpl: Tpl }) {
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"tick" | "data" | "photo">("tick");
  const [unit, setUnit] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg?: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) notify.error(r.error);
      else if (msg) notify.success(msg);
    });

  return (
    <div className={cn("space-y-3 transition-opacity", pending && "opacity-60")}>
      <ul className="space-y-2">
        {tpl.items.map((it, i) => {
          const Icon = TYPE_ICON[it.type];
          return (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.label}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABEL[it.type]}
                  {it.unit ? ` · ${it.unit}` : ""}
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Wajib
                <Switch checked={it.required} onCheckedChange={(c) => run(() => updateTemplateItemAction(it.id, { required: c }))} />
              </label>
              <div className="hidden sm:flex">
                <IconButton icon={ArrowUp} label="Naikkan" size="sm" disabled={i === 0} onClick={() => run(() => moveTemplateItemAction(it.id, -1))} />
                <IconButton icon={ArrowDown} label="Turunkan" size="sm" disabled={i === tpl.items.length - 1} onClick={() => run(() => moveTemplateItemAction(it.id, 1))} />
              </div>
              <IconButton icon={Trash2} label="Hapus item" className="hover:bg-red-500/10 hover:text-red-600" onClick={() => run(() => deleteTemplateItemAction(it.id), "Item dihapus")} />
            </li>
          );
        })}
      </ul>
      <div className="space-y-2 rounded-2xl border border-dashed p-3">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Item baru, mis. Foto label ODP" className="h-11 rounded-xl" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-foreground/[0.05] p-0.5">
            {(["tick", "data", "photo"] as const).map((t) => {
              const Icon = TYPE_ICON[t];
              return (
                <button key={t} type="button" onClick={() => setType(t)} className={cn("flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-[color,background-color,box-shadow] duration-150", type === t ? "bg-background shadow-[0_1px_2px_rgb(0_0_0/0.08)] dark:bg-white/10" : "text-muted-foreground hover:text-foreground")}>
                  <Icon className="size-3.5" /> {TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>
          {type === "data" && <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Satuan" className="h-8 w-24 rounded-lg text-xs" />}
          <Button
            className="ml-auto h-9 rounded-xl"
            disabled={!label.trim() || pending}
            onClick={() =>
              run(async () => {
                const r = await addTemplateItemAction(tpl.id, { label, type, unit, required: true });
                if (r.ok) {
                  setLabel("");
                  setUnit("");
                }
                return r;
              }, "Item ditambahkan")
            }
          >
            <Plus className="size-4" /> Tambah
          </Button>
        </div>
      </div>
    </div>
  );
}

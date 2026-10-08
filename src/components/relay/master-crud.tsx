"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteMasterAction, saveMasterAction } from "@/app/actions/admin";
import { BottomSheet } from "./bottom-sheet";
import { SearchInput } from "./search-input";
import { cn } from "@/lib/utils";
import { PRODUCT_ICONS, ProductIcon } from "@/lib/product-icons";
import { IconButton } from "./icon-button";
import { notify, useAlert } from "./alert";
import { Field, SelectBox, TextArea, TextInput } from "./form";
import { DurationField } from "./duration-field";
import { LocationPicker } from "./location-picker";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { check, masterSchemas, type FieldErrors, type MasterKind } from "@/lib/validation";

type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "checkbox" | "select" | "icon" | "duration" | "location";
  options?: { id: string; name: string }[];
  placeholder?: string;
  hint?: string;
  suffix?: string;
  optional?: boolean;
  /** label pilihan kosong untuk select (mis. "Tanpa pelanggan") */
  emptyLabel?: string;
  defaultValue?: unknown;
  half?: boolean;
  inputMode?: "numeric" | "decimal" | "tel" | "text";
  /** paksa huruf besar saat diketik (kode) — sama dengan yang disimpan server */
  upper?: boolean;
};
type Row = Record<string, unknown> & { id: string; _primary: string; _secondary?: string; _icon?: string };

/** Field "location" mengisi beberapa kolom sekaligus. */
const EXTRA_KEYS: Partial<Record<NonNullable<FieldDef["type"]>, string[]>> = { location: ["lat", "lng"] };
const blank = (f: FieldDef) => f.defaultValue ?? (f.type === "checkbox" ? false : f.type === "icon" ? "box" : "");

/** CRUD generik master data: daftar kartu + form di bottom sheet (validasi langsung) + konfirmasi hapus. */
export function MasterCrud({ kind, title, rows, fields, searchable }: { kind: MasterKind; title: string; rows: Row[]; fields: FieldDef[]; searchable?: boolean }) {
  const { confirm } = useAlert();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();

  const open = (r: Row | "new") => {
    setEditing(r);
    setErrors({});
    setAttempted(false);
    const next: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === "location") for (const k of EXTRA_KEYS.location!) next[k] = r === "new" ? null : (r[k] ?? null);
      else next[f.key] = r === "new" ? blank(f) : (r[f.key] ?? blank(f));
    }
    setForm(next);
  };
  // setelah percobaan simpan pertama, error diperbarui setiap kali isian berubah
  const update = (patch: Record<string, unknown>) => {
    const next = { ...form, ...patch };
    setForm(next);
    if (attempted) {
      const r = check(masterSchemas[kind], next);
      setErrors(r.ok ? {} : r.errors);
    }
  };
  const errorFor = (f: FieldDef) => (f.type === "location" ? (errors.lat ?? errors.lng) : errors[f.key]);

  function submit() {
    setAttempted(true);
    const r = check(masterSchemas[kind], form);
    if (!r.ok) {
      setErrors(r.errors);
      const first = fields.find((f) => errorFor(f) || (f.type === "location" ? r.errors.lat || r.errors.lng : r.errors[f.key]));
      document.querySelector<HTMLElement>(`[data-field="${first?.key}"] input, [data-field="${first?.key}"] textarea, [data-field="${first?.key}"] button`)?.focus();
      return;
    }
    start(async () => {
      const res = await saveMasterAction(kind, editing === "new" ? null : (editing as Row).id, form);
      if (res.ok) {
        notify.success("Tersimpan");
        setEditing(null);
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        notify.error(res.error);
      }
    });
  }

  const list = rows.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <section data-tour="master-section" className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
          {title}
          <span className="tabular rounded-md bg-foreground/[0.06] px-1.5 text-[12px] font-medium leading-5 text-muted-foreground">{rows.length}</span>
        </h2>
        <Button data-tour="master-add" size="sm" variant="outline" className="h-8 rounded-lg bg-card shadow-[var(--shadow-card)]" onClick={() => open("new")}>
          <Plus className="size-4" /> Tambah
        </Button>
      </div>
      {searchable && (
        <SearchInput value={q} onChange={setQ} placeholder={`Cari ${title.toLowerCase()}`} />
      )}
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
        {list.map((r) => (
          <li key={r.id} data-tour="master-row" className="flex items-center gap-1 py-2.5 pl-4 pr-2">
            {r._icon && <RowIcon id={r._icon} />}
            <div className="min-w-0 flex-1 pr-2">
              <p className="truncate text-[14px] font-medium">{r._primary}</p>
              {r._secondary && <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{r._secondary}</p>}
            </div>
            <IconButton icon={Pencil} label="Ubah" onClick={() => open(r)} />
            <IconButton
              icon={Trash2}
              label="Hapus"
              className="hover:bg-red-500/10 hover:text-red-600"
              onClick={async () => {
                if (!(await confirm({ title: `Hapus ${String(r.name ?? "data")}?`, description: "Data yang masih dipakai task tidak bisa dihapus.", tone: "danger", confirmLabel: "Hapus" }))) return;
                start(async () => {
                  const res = await deleteMasterAction(kind, r.id);
                  if (res.ok) notify.success("Dihapus");
                  else notify.error(res.error);
                });
              }}
            />
          </li>
        ))}
        {!list.length && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Tidak ada data.</li>}
      </ul>

      <BottomSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? `Tambah ${title.toLowerCase()}` : `Ubah ${title.toLowerCase()}`}>
        <form
          noValidate
          className="grid grid-cols-2 gap-x-3 gap-y-4 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {fields.map((f) => {
            const err = errorFor(f);
            const val = form[f.key];
            return (
              <div key={f.key} data-field={f.key} className={f.half ? "col-span-2 sm:col-span-1" : "col-span-2"}>
                {f.type === "checkbox" ? (
                  <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-[14px]">
                    <span>
                      {f.label}
                      {f.hint && <span className="mt-0.5 block text-[12px] text-muted-foreground">{f.hint}</span>}
                    </span>
                    <Switch checked={!!val} onCheckedChange={(c) => update({ [f.key]: c })} />
                  </label>
                ) : (
                  <Field label={f.label} error={err} hint={f.hint} optional={f.optional}>
                    {(id, describedBy) =>
                      f.type === "textarea" ? (
                        <TextArea id={id} aria-describedby={describedBy} invalid={!!err} value={String(val ?? "")} placeholder={f.placeholder} onChange={(e) => update({ [f.key]: e.target.value })} />
                      ) : f.type === "icon" ? (
                        <IconPicker value={String(val ?? "box")} onChange={(v) => update({ [f.key]: v })} />
                      ) : f.type === "select" ? (
                        <SelectBox id={id} describedBy={describedBy} invalid={!!err} value={String(val ?? "")} onChange={(v) => update({ [f.key]: v })} options={f.options ?? []} emptyLabel={f.emptyLabel} placeholder={f.placeholder} />
                      ) : f.type === "duration" ? (
                        <DurationField id={id} describedBy={describedBy} invalid={!!err} value={val as number} onChange={(h) => update({ [f.key]: h })} />
                      ) : f.type === "location" ? (
                        <LocationPicker
                          lat={typeof form.lat === "number" ? form.lat : form.lat ? Number(form.lat) : null}
                          lng={typeof form.lng === "number" ? form.lng : form.lng ? Number(form.lng) : null}
                          radius={Number(form.radiusM) || 0}
                          address={String(form.address ?? "")}
                          invalid={!!err}
                          onChange={(p) => update(p)}
                        />
                      ) : (
                        <TextInput
                          id={id}
                          aria-describedby={describedBy}
                          invalid={!!err}
                          inputMode={f.inputMode ?? (f.type === "number" ? "numeric" : undefined)}
                          suffix={f.suffix}
                          value={String(val ?? "")}
                          placeholder={f.placeholder}
                          onChange={(e) => update({ [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value })}
                          autoCapitalize={f.upper ? "characters" : undefined}
                        />
                      )
                    }
                  </Field>
                )}
              </div>
            );
          })}
          {attempted && fields.some((f) => errorFor(f)) && (
            <p role="alert" className="col-span-2 rounded-xl bg-red-500/[0.07] px-3.5 py-2.5 text-[12.5px] font-medium text-red-700 dark:text-red-300">
              {fields.filter((f) => errorFor(f)).length} isian perlu diperbaiki sebelum disimpan.
            </p>
          )}
          <Button type="submit" disabled={pending} className="col-span-2 mt-1 h-12 rounded-xl">
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
      </BottomSheet>
    </section>
  );
}

function RowIcon({ id }: { id: string }) {
  return (
    <span className="mr-2 flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-foreground/[0.05] text-muted-foreground">
      <ProductIcon id={id} className="size-[18px]" />
    </span>
  );
}

/** Pilih ikon dari daftar tetap (lib/product-icons.ts): grid tombol, label di bawah ikon. */
function IconPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Ikon" className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
      {PRODUCT_ICONS.map((i) => {
        const on = value === i.id;
        return (
          <button
            key={i.id}
            type="button"
            role="radio"
            aria-checked={on}
            data-selected={on}
            title={i.label}
            onClick={() => onChange(i.id)}
            className="card-interactive flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl px-1 text-center"
          >
            <i.icon className={cn("size-5", on ? "text-primary" : "text-muted-foreground")} />
            <span className="line-clamp-1 text-[10.5px] leading-tight text-muted-foreground">{i.label}</span>
          </button>
        );
      })}
    </div>
  );
}

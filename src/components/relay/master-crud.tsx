"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteMasterAction, saveMasterAction } from "@/app/actions/admin";
import { BottomSheet } from "./bottom-sheet";
import { IconButton } from "./icon-button";
import { notify, useAlert } from "./alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Kind = "categories" | "products" | "priorities" | "customers" | "sites";
type FieldDef = { key: string; label: string; type?: "text" | "number" | "textarea" | "checkbox" | "select"; options?: { id: string; name: string }[]; placeholder?: string; half?: boolean };
type Row = Record<string, unknown> & { id: string; _primary: string; _secondary?: string };

/** CRUD generik master data: daftar kartu + form di bottom sheet + konfirmasi hapus. */
export function MasterCrud({ kind, title, rows, fields, searchable }: { kind: Kind; title: string; rows: Row[]; fields: FieldDef[]; searchable?: boolean }) {
  const { confirm } = useAlert();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();

  const open = (r: Row | "new") => {
    setEditing(r);
    setForm(r === "new" ? Object.fromEntries(fields.map((f) => [f.key, f.type === "checkbox" ? false : ""])) : Object.fromEntries(fields.map((f) => [f.key, r[f.key] ?? (f.type === "checkbox" ? false : "")])));
  };
  const list = rows.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
          {title}
          <span className="tabular rounded-md bg-foreground/[0.06] px-1.5 text-[12px] font-medium leading-5 text-muted-foreground">{rows.length}</span>
        </h2>
        <Button size="sm" variant="outline" className="h-8 rounded-lg bg-card shadow-[var(--shadow-card)]" onClick={() => open("new")}>
          <Plus className="size-4" /> Tambah
        </Button>
      </div>
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari ${title.toLowerCase()}…`} className="h-10 rounded-xl pl-10" />
        </div>
      )}
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
        {list.map((r) => (
          <li key={r.id} className="flex items-center gap-1 py-2.5 pl-4 pr-2">
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
          className="grid grid-cols-2 gap-3 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveMasterAction(kind, editing === "new" ? null : (editing as Row).id, form);
              if (res.ok) {
                notify.success("Tersimpan");
                setEditing(null);
              } else notify.error(res.error);
            });
          }}
        >
          {fields.map((f) => (
            <div key={f.key} className={f.half ? "col-span-1 space-y-1.5" : "col-span-2 space-y-1.5"}>
              {f.type === "checkbox" ? (
                <label className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm">
                  {f.label}
                  <Switch checked={!!form[f.key]} onCheckedChange={(c) => setForm((p) => ({ ...p, [f.key]: c }))} />
                </label>
              ) : (
                <>
                  <Label>{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea value={String(form[f.key] ?? "")} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className="rounded-xl" rows={2} />
                  ) : f.type === "select" ? (
                    <select value={String(form[f.key] ?? "")} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className="h-11 w-full rounded-xl border bg-background px-3 text-sm">
                      <option value="">—</option>
                      {f.options?.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input type={f.type === "number" ? "number" : "text"} step="any" value={String(form[f.key] ?? "")} placeholder={f.placeholder} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className="h-11 rounded-xl" />
                  )}
                </>
              )}
            </div>
          ))}
          <Button type="submit" disabled={pending} className="col-span-2 mt-2 h-12 rounded-xl">
            Simpan
          </Button>
        </form>
      </BottomSheet>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { notify } from "@/components/relay/notify";
import { ArrowDown, ArrowUp, Check, Hash, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { createTaskAction } from "@/app/actions/tasks";
import { Avatar } from "@/components/relay/avatar-stack";
import { PriorityLabel } from "@/components/relay/badges";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/relay/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Item = { label: string; type: "tick" | "data" | "photo"; unit: string; required: boolean };
type Props = {
  categories: { id: string; name: string; code: string; groupId: string; groupName: string }[];
  products: { id: string; name: string }[];
  priorities: { id: string; name: string; level: number; slaHours: number }[];
  sites: { id: string; name: string; address: string; customerId: string | null }[];
  customers: { id: string; name: string; customerNo: string }[];
  technicians: { id: string; name: string; groupId: string; load: number }[];
  templates: { categoryId: string; productId: string; items: Item[] }[];
};

const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** Pemilih tipe item — terinspirasi KokonutUI Toolbar (MIT). */
const TYPES = [
  { id: "tick", label: "Centang", icon: Check },
  { id: "data", label: "Data", icon: Hash },
  { id: "photo", label: "Foto", icon: ImageIcon },
] as const;

export function NewTaskForm(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [categoryId, setCategoryId] = useState(p.categories[0]?.id ?? "");
  const [productId, setProductId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [siteQuery, setSiteQuery] = useState("");
  const [siteId, setSiteId] = useState("");
  const [priorityId, setPriorityId] = useState(p.priorities.find((x) => x.level === 2)?.id ?? "");
  const [scheduledFor, setScheduledFor] = useState(() => toLocal(new Date(Date.now() + 3600_000)));
  const [dueAt, setDueAt] = useState("");
  const [dueTouched, setDueTouched] = useState(false);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const category = p.categories.find((c) => c.id === categoryId);
  const isTS = category?.code === "TS";
  const techs = p.technicians.filter((t) => t.groupId === category?.groupId);
  const priority = p.priorities.find((x) => x.id === priorityId);
  const computedDue = useMemo(() => {
    if (!priority || !scheduledFor) return "";
    return toLocal(new Date(new Date(scheduledFor).getTime() + priority.slaHours * 3600_000));
  }, [priority, scheduledFor]);
  const effectiveDue = dueTouched ? dueAt : computedDue;
  const site = p.sites.find((s) => s.id === siteId);
  const customer = site?.customerId ? p.customers.find((c) => c.id === site.customerId) : null;
  const siteOptions = p.sites
    .filter((s) => (isTS ? s.customerId : !s.customerId))
    .filter((s) => !siteQuery || `${s.name} ${s.address}`.toLowerCase().includes(siteQuery.toLowerCase()))
    .slice(0, 6);

  function pickTemplate(cat: string, prod: string) {
    const tpl = p.templates.find((t) => t.categoryId === cat && t.productId === prod);
    setItems(tpl ? tpl.items.map((i) => ({ ...i })) : []);
  }

  const updateItem = (i: number, patch: Partial<Item>) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: -1 | 1) =>
    setItems((arr) => {
      const next = [...arr];
      const j = i + d;
      if (j < 0 || j >= next.length) return arr;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function submit() {
    start(async () => {
      const res = await createTaskAction({
        title,
        description,
        categoryId,
        productId,
        priorityId,
        siteId,
        customerId: customer?.id,
        scheduledFor: new Date(scheduledFor).toISOString(),
        dueAt: effectiveDue ? new Date(effectiveDue).toISOString() : "",
        assigneeIds: assignees,
        items: items.map((i) => ({ ...i, unit: i.unit || undefined })),
      });
      if (res.ok) {
        notify.success("Task dibuat & ditugaskan");
        router.push(`/tasks/${res.id}`);
      } else notify.error(res.error);
    });
  }

  return (
    <div className="space-y-8">
      <Block step={1} title="Kategori & produk">
        <Chips
          options={p.categories.map((c) => ({ id: c.id, label: c.name, hint: c.groupName }))}
          value={categoryId}
          onChange={(id) => {
            setCategoryId(id);
            setAssignees([]);
            setSiteId("");
            if (productId) pickTemplate(id, productId);
          }}
        />
        <Chips
          options={p.products.map((x) => ({ id: x.id, label: x.name }))}
          value={productId}
          onChange={(id) => {
            setProductId(id);
            pickTemplate(categoryId, id);
          }}
        />
        {category && <p className="text-xs text-muted-foreground">Ditangani oleh {category.groupName}.</p>}
      </Block>

      <Block step={2} title="Detail pekerjaan">
        <div className="space-y-1.5">
          <Label>Judul</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isTS ? "mis. Internet mati total" : "mis. Maintenance rutin ODC"} className="h-12 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label>Deskripsi</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-xl" placeholder="Informasi tambahan untuk teknisi (opsional)" />
        </div>
      </Block>

      <Block step={3} title={isTS ? "Pelanggan & lokasi" : "Lokasi"}>
        {site ? (
          <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{customer?.name ?? site.name}</p>
              <p className="text-muted-foreground">{site.address}</p>
              {customer && <p className="text-xs text-muted-foreground">{customer.customerNo}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSiteId("")}>
              Ganti
            </Button>
          </div>
        ) : (
          <>
            <Input value={siteQuery} onChange={(e) => setSiteQuery(e.target.value)} placeholder={isTS ? "Cari nama pelanggan / alamat" : "Cari site (ODC, BTS, headend…)"} className="h-12 rounded-xl" />
            <div className="divide-y overflow-hidden rounded-xl border">
              {siteOptions.map((s) => (
                <button key={s.id} type="button" onClick={() => setSiteId(s.id)} className="block w-full px-3 py-2.5 text-left text-sm hover:bg-muted">
                  <span className="font-medium">{s.customerId ? p.customers.find((c) => c.id === s.customerId)?.name : s.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.address}</span>
                </button>
              ))}
              {!siteOptions.length && <p className="px-3 py-3 text-sm text-muted-foreground">Tidak ditemukan.</p>}
            </div>
          </>
        )}
      </Block>

      <Block step={4} title="Prioritas & jadwal">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {p.priorities.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setPriorityId(x.id)}
              aria-pressed={priorityId === x.id}
              className="card-interactive rounded-xl px-3 py-2.5 text-left"
            >
              <PriorityLabel level={x.level} name={x.name} className="text-sm" />
              <span className="mt-0.5 block text-xs text-muted-foreground">SLA {x.slaHours >= 24 ? `${x.slaHours / 24} hari` : `${x.slaHours} jam`}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Jadwal</Label>
            <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Deadline {dueTouched ? "" : <span className="font-normal text-muted-foreground">(otomatis dari SLA)</span>}</Label>
            <Input
              type="datetime-local"
              value={effectiveDue}
              onChange={(e) => {
                setDueTouched(true);
                setDueAt(e.target.value);
              }}
              className="h-12 rounded-xl"
            />
          </div>
        </div>
      </Block>

      <Block step={5} title="Teknisi" hint="Bisa lebih dari satu. Mereka berbagi 1 checklist & 1 laporan.">
        <div className="grid gap-2 sm:grid-cols-2">
          {techs.map((t) => {
            const on = assignees.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAssignees((a) => (on ? a.filter((x) => x !== t.id) : [...a, t.id]))}
                aria-pressed={on}
                className="card-interactive flex items-center gap-3 rounded-xl p-3 text-left"
              >
                <Avatar id={t.id} name={t.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.load} task aktif</span>
                </span>
                <span className={cn("flex size-[22px] items-center justify-center rounded-full border transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out)]", on ? "scale-100 border-primary bg-primary text-primary-foreground" : "scale-95 border-foreground/20")}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
              </button>
            );
          })}
        </div>
      </Block>

      <Block step={6} title={`Checklist (${items.length})`} hint={productId ? "Diisi dari template. Silakan tambah, hapus, atau ubah untuk task ini." : "Pilih produk untuk memuat template."}>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl border bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                <Input value={it.label} onChange={(e) => updateItem(i, { label: e.target.value })} className="h-10 flex-1 rounded-lg" placeholder="Label item" />
                <IconButton icon={Trash2} label="Hapus item" className="hover:bg-red-500/10 hover:text-red-600" onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))} />
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-7">
                <div className="flex rounded-lg bg-foreground/[0.05] p-0.5">
                  {TYPES.map((tp) => (
                    <button key={tp.id} type="button" onClick={() => updateItem(i, { type: tp.id })} className={cn("flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-[color,background-color,box-shadow] duration-150", it.type === tp.id ? "bg-background shadow-[0_1px_2px_rgb(0_0_0/0.08)] dark:bg-white/10" : "text-muted-foreground hover:text-foreground")}>
                      <tp.icon className="size-3.5" />
                      {it.type === tp.id && tp.label}
                    </button>
                  ))}
                </div>
                {it.type === "data" && <Input value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })} placeholder="Satuan" className="h-8 w-20 rounded-lg text-xs" />}
                <label className="ml-auto flex items-center gap-2 text-xs">
                  Wajib <Switch checked={it.required} onCheckedChange={(c) => updateItem(i, { required: c })} />
                </label>
                <IconButton icon={ArrowUp} label="Naikkan" size="sm" onClick={() => move(i, -1)} />
                <IconButton icon={ArrowDown} label="Turunkan" size="sm" onClick={() => move(i, 1)} />
              </div>
            </div>
          ))}
          <Button variant="outline" className="h-11 w-full rounded-xl border-dashed" onClick={() => setItems((a) => [...a, { label: "", type: "tick", unit: "", required: true }])}>
            <Plus className="size-4" /> Tambah item
          </Button>
        </div>
      </Block>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-foreground/[0.06] bg-background/85 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 lg:bottom-0 lg:left-[248px]">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button variant="outline" className="h-12 rounded-xl" onClick={() => router.back()}>
            Batal
          </Button>
          <Button className="h-12 flex-1 rounded-xl text-[15px]" disabled={pending} onClick={submit}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null} Buat & tugaskan
          </Button>
        </div>
      </div>
    </div>
  );
}

function Block({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{step}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

function Chips({ options, value, onChange }: { options: { id: string; label: string; hint?: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id} className="chip h-10">
          {o.label}
        </button>
      ))}
    </div>
  );
}

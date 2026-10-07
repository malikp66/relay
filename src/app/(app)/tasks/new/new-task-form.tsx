"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Box,
  Cable,
  CalendarClock,
  Check,
  Hash,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MonitorPlay,
  Plus,
  RadioTower,
  RotateCcw,
  Search,
  Trash2,
  Tv,
  Wrench,
  X,
} from "lucide-react";
import { notify } from "@/components/relay/notify";
import { createTaskAction } from "@/app/actions/tasks";
import { Avatar } from "@/components/relay/avatar-stack";
import { PriorityLabel } from "@/components/relay/badges";
import { DateTimePicker, toLocalDateTime, type Preset } from "@/components/relay/date-time-picker";
import { IconButton } from "@/components/relay/icon-button";
import { UnitSelect } from "@/components/relay/unit-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Item = { label: string; type: "tick" | "data" | "photo"; unit: string; required: boolean };
type Props = {
  categories: { id: string; name: string; code: string; groupId: string; groupName: string }[];
  products: { id: string; name: string; code: string }[];
  priorities: { id: string; name: string; level: number; slaHours: number }[];
  sites: { id: string; name: string; address: string; customerId: string | null }[];
  customers: { id: string; name: string; customerNo: string }[];
  technicians: { id: string; name: string; groupId: string; load: number }[];
  templates: { categoryId: string; productId: string; items: Item[] }[];
};

/** Pemilih tipe item — terinspirasi KokonutUI Toolbar (MIT). */
const TYPES = [
  { id: "tick", label: "Centang", icon: Check },
  { id: "data", label: "Data", icon: Hash },
  { id: "photo", label: "Foto", icon: ImageIcon },
] as const;

const CATEGORY_ICON: Record<string, typeof Wrench> = { TS: Wrench, MT: CalendarClock };
const PRODUCT_ICON: Record<string, typeof Wrench> = { FO: Cable, RD: RadioTower, IP: Tv, DT: MonitorPlay };
const TITLE_HINTS: Record<string, string[]> = {
  TS: ["Internet mati total", "Koneksi lambat", "Redaman tinggi", "Perangkat rusak"],
  MT: ["Maintenance rutin", "Pembersihan perangkat", "Pengukuran redaman", "Penggantian baterai"],
};

const sla = (h: number) => (h >= 24 ? `${h / 24} hari` : `${h} jam`);
const at = (days: number, h: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, 0, 0, 0);
  return d;
};
const roundUp = (ms: number, step = 30) => {
  const d = new Date(ms);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / step) * step);
  return d;
};
const SCHEDULE_PRESETS: Preset[] = [
  { label: "Sekarang", value: () => roundUp(Date.now(), 5) },
  { label: "+1 jam", value: () => roundUp(Date.now() + 3600_000) },
  { label: "Besok 08.00", value: () => at(1, 8) },
  { label: "Lusa 08.00", value: () => at(2, 8) },
];
const fmtShort = (v: string) =>
  v ? `${new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short" }).format(new Date(v))}, ${v.slice(11, 16).replace(":", ".")}` : "Belum dipilih";

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
  const [scheduledFor, setScheduledFor] = useState(() => toLocalDateTime(roundUp(Date.now() + 3600_000)));
  const [dueAt, setDueAt] = useState("");
  const [dueTouched, setDueTouched] = useState(false);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const category = p.categories.find((c) => c.id === categoryId);
  const product = p.products.find((x) => x.id === productId);
  const isTS = category?.code === "TS";
  const techs = p.technicians.filter((t) => t.groupId === category?.groupId);
  const priority = p.priorities.find((x) => x.id === priorityId);
  const computedDue = useMemo(() => {
    if (!priority || !scheduledFor) return "";
    return toLocalDateTime(new Date(new Date(scheduledFor).getTime() + priority.slaHours * 3600_000));
  }, [priority, scheduledFor]);
  const effectiveDue = dueTouched ? dueAt : computedDue;
  const site = p.sites.find((s) => s.id === siteId);
  const customer = site?.customerId ? p.customers.find((c) => c.id === site.customerId) : null;
  const siteName = (s: Props["sites"][number]) => (s.customerId ? p.customers.find((c) => c.id === s.customerId)?.name ?? s.name : s.name);
  const siteOptions = p.sites
    .filter((s) => (isTS ? s.customerId : !s.customerId))
    .filter((s) => !siteQuery || `${siteName(s)} ${s.address}`.toLowerCase().includes(siteQuery.toLowerCase()))
    .slice(0, 6);
  const assigned = p.technicians.filter((t) => assignees.includes(t.id));

  // Sama dengan validasi server (createSchema) — supaya kekurangan terlihat sebelum dikirim
  const missing = [
    !productId && { step: 1, label: "Pilih produk" },
    title.trim().length < 3 && { step: 2, label: "Tulis judul (min. 3 huruf)" },
    !siteId && { step: 3, label: isTS ? "Pilih pelanggan" : "Pilih lokasi" },
    !effectiveDue && { step: 4, label: "Isi deadline" },
    !assignees.length && { step: 5, label: "Pilih teknisi" },
    items.some((i) => !i.label.trim()) && { step: 6, label: "Lengkapi label checklist" },
  ].filter(Boolean) as { step: number; label: string }[];
  const doneSteps = new Set([1, 2, 3, 4, 5, 6].filter((s) => !missing.some((m) => m.step === s)));

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

  const goTo = (step: number) => document.querySelector(`[data-tour="new-${step}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  function submit() {
    if (missing.length) {
      notify.error(missing[0].label);
      goTo(missing[0].step);
      return;
    }
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

  const submitLabel = (
    <>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Buat & tugaskan
    </>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="min-w-0 space-y-4">
        {/* 1 — Kategori & produk */}
        <Step step={1} done={doneSteps.has(1)} title="Kategori & produk" hint="Menentukan crew yang menangani dan template checklist.">
          <div className={cn("grid gap-2", p.categories.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {p.categories.map((c) => {
              const Icon = CATEGORY_ICON[c.code] ?? Box;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={categoryId === c.id}
                  onClick={() => {
                    if (c.id === categoryId) return;
                    setCategoryId(c.id);
                    setAssignees([]);
                    setSiteId("");
                    setSiteQuery("");
                    if (productId) pickTemplate(c.id, productId);
                  }}
                  className="card-interactive flex items-center gap-3 rounded-xl p-3 text-left"
                >
                  <span className={cn("hidden size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 min-[400px]:flex", categoryId === c.id ? "bg-primary/10 text-primary" : "bg-foreground/[0.05] text-muted-foreground")}>
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold">{c.name}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{c.groupName}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div>
            <p className="mb-2 text-[12.5px] font-medium text-muted-foreground">Produk</p>
            <div className="flex flex-wrap gap-2">
              {p.products.map((x) => {
                const Icon = PRODUCT_ICON[x.code] ?? Box;
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => {
                      setProductId(x.id);
                      pickTemplate(categoryId, x.id);
                    }}
                    aria-pressed={productId === x.id}
                    className="chip h-10 gap-1.5"
                  >
                    <Icon className="size-4 opacity-70" />
                    {x.name}
                  </button>
                );
              })}
            </div>
          </div>
        </Step>

        {/* 2 — Detail */}
        <Step step={2} done={doneSteps.has(2)} title="Detail pekerjaan">
          <div className="space-y-2">
            <Label htmlFor="nt-title" className="text-[13px]">
              Judul
            </Label>
            <Input id="nt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isTS ? "mis. Internet mati total" : "mis. Maintenance rutin ODC"} className="h-12 rounded-xl text-base sm:text-[14.5px]" />
            {!title && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none]">
                {(TITLE_HINTS[category?.code ?? ""] ?? []).map((h) => (
                  <button key={h} type="button" onClick={() => setTitle(product ? `${h} · ${product.name}` : h)} className="chip h-8 shrink-0 px-3 text-[12.5px]">
                    <Plus className="size-3.5 opacity-60" />
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nt-desc" className="text-[13px]">
              Deskripsi <span className="font-normal text-muted-foreground">· opsional</span>
            </Label>
            <Textarea id="nt-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-xl text-base sm:text-[14.5px]" placeholder="Informasi tambahan untuk teknisi, mis. patokan lokasi atau kontak di tempat." />
          </div>
        </Step>

        {/* 3 — Lokasi */}
        <Step step={3} done={doneSteps.has(3)} title={isTS ? "Pelanggan & lokasi" : "Lokasi"} hint="Titik lokasi dipakai untuk verifikasi check-in teknisi.">
          {site ? (
            <div className="flex items-start gap-3 rounded-xl border bg-foreground/[0.02] p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <MapPin className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{customer?.name ?? site.name}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{site.address}</p>
                {customer && <p className="mt-1 font-mono text-[11.5px] text-muted-foreground">{customer.customerNo}</p>}
              </div>
              <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[12.5px]" onClick={() => setSiteId("")}>
                Ganti
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="relative border-b">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={siteQuery}
                  onChange={(e) => setSiteQuery(e.target.value)}
                  placeholder={isTS ? "Cari nama pelanggan atau alamat" : "Cari site (ODC, BTS, headend…)"}
                  className="h-12 w-full bg-transparent pl-10 pr-10 text-base outline-none placeholder:text-muted-foreground sm:text-[14.5px]"
                />
                {siteQuery && (
                  <button type="button" aria-label="Hapus pencarian" onClick={() => setSiteQuery("")} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06]">
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <div className="divide-y">
                {siteOptions.map((s) => (
                  <button key={s.id} type="button" onClick={() => setSiteId(s.id)} className="group flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-foreground/[0.03]">
                    <MapPin className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{siteName(s)}</span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">{s.address}</span>
                    </span>
                    <span className="text-[12px] font-medium text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100">Pilih</span>
                  </button>
                ))}
                {!siteOptions.length && <p className="px-3.5 py-4 text-center text-[13px] text-muted-foreground">Tidak ada yang cocok dengan “{siteQuery}”.</p>}
              </div>
            </div>
          )}
        </Step>

        {/* 4 — Prioritas & jadwal */}
        <Step step={4} done={doneSteps.has(4)} title="Prioritas & jadwal" hint="Deadline dihitung otomatis dari SLA prioritas dan tetap bisa diubah.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {p.priorities.map((x) => (
              <button key={x.id} type="button" onClick={() => setPriorityId(x.id)} aria-pressed={priorityId === x.id} className="card-interactive rounded-xl px-3 py-2.5 text-left">
                <PriorityLabel level={x.level} name={x.name} className="text-[13.5px]" />
                <span className="tabular mt-1 block text-[12px] text-muted-foreground">SLA {sla(x.slaHours)}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[13px]">Jadwal mulai</Label>
              <DateTimePicker value={scheduledFor} onChange={setScheduledFor} presets={SCHEDULE_PRESETS} />
            </div>
            <div className="space-y-2">
              <div className="flex h-[19.5px] items-center justify-between gap-2">
                <Label className="text-[13px]">Deadline</Label>
                {dueTouched ? (
                  <button type="button" onClick={() => setDueTouched(false)} className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
                    <RotateCcw className="size-3" /> Pakai SLA
                  </button>
                ) : (
                  <span className="rounded-md bg-foreground/[0.05] px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{priority ? `Otomatis · SLA ${sla(priority.slaHours)}` : "Otomatis"}</span>
                )}
              </div>
              <DateTimePicker
                value={effectiveDue}
                min={scheduledFor}
                onChange={(v) => {
                  setDueTouched(true);
                  setDueAt(v);
                }}
              />
            </div>
          </div>
        </Step>

        {/* 5 — Teknisi */}
        <Step step={5} done={doneSteps.has(5)} title="Teknisi" hint={`Dari ${category?.groupName ?? "crew"}. Bisa lebih dari satu, mereka berbagi satu checklist dan satu laporan.`} count={assignees.length || undefined}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {techs.map((t) => {
              const on = assignees.includes(t.id);
              const busy = t.load >= 4 ? "Padat" : t.load >= 2 ? "Sedang" : "Longgar";
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
                    <span className="block truncate text-[14px] font-medium">{t.name}</span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="flex gap-0.5" aria-hidden>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span key={i} className={cn("h-1.5 w-2.5 rounded-full", i < Math.min(t.load, 5) ? (t.load >= 4 ? "bg-amber-500" : "bg-foreground/40") : "bg-foreground/10")} />
                        ))}
                      </span>
                      <span className="tabular text-[12px] text-muted-foreground">
                        {t.load} aktif · {busy}
                      </span>
                    </span>
                  </span>
                  <span className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out)]", on ? "scale-100 border-primary bg-primary text-primary-foreground" : "scale-95 border-foreground/20")}>
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
            {!techs.length && <p className="rounded-xl border border-dashed px-4 py-5 text-center text-[13px] text-muted-foreground sm:col-span-2">Belum ada teknisi di crew ini.</p>}
          </div>
        </Step>

        {/* 6 — Checklist */}
        <Step
          step={6}
          done={doneSteps.has(6) && items.length > 0}
          title="Checklist"
          count={items.length || undefined}
          hint={productId ? "Diisi dari template. Tambah, hapus, ubah tipe, atau atur urutan untuk task ini." : "Pilih produk di langkah 1 untuk memuat template."}
        >
          {items.length > 0 && (
            <ol className="space-y-2">
              {items.map((it, i) => (
                <li key={i} className="rounded-xl border bg-card p-2.5 pl-3">
                  <div className="flex items-center gap-2">
                    <span className="tabular w-5 shrink-0 text-center text-[12px] font-medium text-muted-foreground">{i + 1}</span>
                    <Input
                      value={it.label}
                      onChange={(e) => updateItem(i, { label: e.target.value })}
                      className={cn("h-10 flex-1 rounded-lg border-transparent bg-foreground/[0.03] text-[14px] shadow-none focus-visible:bg-background", !it.label.trim() && "border-amber-500/40")}
                      placeholder="Tulis item pekerjaan"
                    />
                    <IconButton icon={Trash2} label="Hapus item" className="hover:bg-red-500/10 hover:text-red-600" onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                    <div className="flex rounded-lg bg-foreground/[0.05] p-0.5">
                      {TYPES.map((tp) => (
                        <button
                          key={tp.id}
                          type="button"
                          aria-label={tp.label}
                          aria-pressed={it.type === tp.id}
                          onClick={() => updateItem(i, { type: tp.id })}
                          className={cn(
                            "flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium transition-[color,background-color,box-shadow] duration-150",
                            it.type === tp.id ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)] dark:bg-white/10" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <tp.icon className="size-3.5" />
                          <span className={cn(it.type === tp.id ? "inline" : "hidden sm:inline")}>{tp.label}</span>
                        </button>
                      ))}
                    </div>
                    {it.type === "data" && <UnitSelect value={it.unit} onChange={(unit) => updateItem(i, { unit })} />}
                    <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
                      Wajib <Switch checked={it.required} onCheckedChange={(c) => updateItem(i, { required: c })} />
                    </label>
                    <span className="flex">
                      <IconButton icon={ArrowUp} label="Naikkan" size="sm" disabled={i === 0} onClick={() => move(i, -1)} />
                      <IconButton icon={ArrowDown} label="Turunkan" size="sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} />
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <button
            type="button"
            onClick={() => setItems((a) => [...a, { label: "", type: "tick", unit: "", required: true }])}
            className="press flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-foreground/15 text-[13.5px] font-medium text-muted-foreground transition-colors duration-150 hover:border-foreground/30 hover:bg-foreground/[0.02] hover:text-foreground"
          >
            <Plus className="size-4" /> Tambah item
          </button>
        </Step>
      </div>

      {/* Ringkasan — desktop */}
      <aside className="sticky top-20 hidden lg:block">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b px-4 py-3.5">
            <p className="text-[13px] font-medium text-muted-foreground">Ringkasan</p>
            <p className={cn("mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug", !title.trim() && "text-muted-foreground")}>{title.trim() || "Task tanpa judul"}</p>
          </div>
          <dl className="divide-y text-[13px]">
            <Row label="Kategori" value={[category?.name, product?.name].filter(Boolean).join(" · ") || "Belum dipilih"} />
            <Row label="Lokasi" value={site ? (customer?.name ?? site.name) : "Belum dipilih"} />
            <Row label="Prioritas" value={priority ? <PriorityLabel level={priority.level} name={priority.name} className="text-[13px]" /> : "Belum dipilih"} />
            <Row label="Jadwal" value={fmtShort(scheduledFor)} />
            <Row label="Deadline" value={fmtShort(effectiveDue)} />
            <Row label="Teknisi" value={assigned.length ? assigned.map((t) => t.name.split(" ")[0]).join(", ") : "Belum dipilih"} />
            <Row label="Checklist" value={items.length ? `${items.length} item · ${items.filter((i) => i.required).length} wajib` : "Belum ada"} />
          </dl>
          <div className="border-t p-4">
            {missing.length ? (
              <ul className="mb-3 space-y-1.5">
                {missing.map((m) => (
                  <li key={m.label}>
                    <button type="button" onClick={() => goTo(m.step)} className="flex w-full items-center gap-2 text-left text-[12.5px] text-muted-foreground hover:text-foreground">
                      <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                      {m.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" strokeWidth={3} /> Siap ditugaskan
              </p>
            )}
            <div data-tour="new-submit" className="space-y-2">
              <Button className="h-11 w-full rounded-xl text-[14px]" disabled={pending} onClick={submit}>
                {submitLabel}
              </Button>
              <Button variant="ghost" className="h-10 w-full rounded-xl text-[13px] text-muted-foreground" onClick={() => router.back()}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Bar aksi — mobile/tablet */}
      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 border-t border-foreground/[0.06] bg-background/85 px-4 pt-2.5 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {missing.length ? (
            <>
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span className="tabular">{missing.length}</span> hal lagi · <button type="button" onClick={() => goTo(missing[0].step)} className="font-medium text-foreground underline-offset-2 hover:underline">{missing[0].label}</button>
            </>
          ) : (
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="size-3.5" strokeWidth={3} /> Siap ditugaskan
            </span>
          )}
        </p>
        <div data-tour="new-submit" className="flex gap-2 pb-3">
          <Button variant="outline" className="h-12 rounded-xl" onClick={() => router.back()}>
            Batal
          </Button>
          <Button className="h-12 flex-1 rounded-xl text-[15px]" disabled={pending} onClick={submit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Step({ step, done, title, hint, count, children }: { step: number; done?: boolean; title: string; hint?: string; count?: number; children: React.ReactNode }) {
  return (
    <section data-tour={`new-${step}`} className="scroll-mt-20 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            "tabular relative mt-px flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors duration-200 ease-[var(--ease-out)]",
            done ? "bg-emerald-500 text-white" : "bg-foreground/[0.07] text-foreground",
          )}
        >
          <span className={cn("transition-[opacity,transform] duration-200 ease-[var(--ease-out)]", done ? "scale-50 opacity-0" : "scale-100 opacity-100")}>{step}</span>
          <Check className={cn("absolute size-3.5 transition-[opacity,transform] duration-200 ease-[var(--ease-out)]", done ? "scale-100 opacity-100" : "scale-50 opacity-0")} strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
            {title}
            {count ? <span className="tabular rounded-md bg-foreground/[0.06] px-1.5 text-[11.5px] font-medium text-muted-foreground">{count}</span> : null}
          </h2>
          {hint && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 truncate text-right font-medium", (value === "Belum dipilih" || value === "Belum ada") && "font-normal text-muted-foreground")}>{value}</dd>
    </div>
  );
}

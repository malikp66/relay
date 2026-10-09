"use client";

import { useRouter } from "next/navigation";
import { Reorder, useDragControls } from "motion/react";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownWideNarrow,
  Box,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  GripVertical,
  Hash,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Trash2,
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
import { Segmented } from "@/components/relay/segmented";
import { TextArea, TextInput } from "@/components/relay/form";
import { SearchInput } from "@/components/relay/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ProductIcon } from "@/lib/product-icons";

type Item = { label: string; type: "tick" | "data" | "photo"; unit: string; required: boolean };
type Draft = Item & { uid: string };
let seq = 0;
const uid = () => `i${++seq}`;
type Props = {
  categories: { id: string; name: string; code: string; groupId: string; groupName: string }[];
  products: { id: string; name: string; code: string; icon: string | null }[];
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
  const [items, setItems] = useState<Draft[]>([]);
  const [attempted, setAttempted] = useState(false);

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
    setItems(tpl ? tpl.items.map((i) => ({ ...i, uid: uid() })) : []);
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

  const goTo = (step: number, focus = false) => {
    const el = document.querySelector<HTMLElement>(`[data-tour="new-${step}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    // arahkan kursor ke isian pertama di kartu itu (tanpa menggulir ulang)
    if (focus) setTimeout(() => (el?.querySelector<HTMLElement>("[data-autofocus]") ?? el?.querySelector<HTMLElement>("input, textarea, button"))?.focus({ preventScroll: true }), 350);
  };
  // tandai kartu yang kurang hanya setelah user mencoba menyimpan (bukan sejak awal)
  const errorsFor = (step: number) => (attempted ? missing.filter((m) => m.step === step).map((m) => m.label) : []);

  function submit() {
    if (missing.length) {
      setAttempted(true);
      notify.error(missing.length === 1 ? missing[0].label : `${missing.length} bagian belum lengkap`, missing.length > 1 ? { description: missing.map((m) => m.label).join(" · ") } : undefined);
      goTo(missing[0].step, true);
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
        items: items.map((i) => ({ label: i.label, type: i.type, required: i.required, unit: i.unit || undefined })),
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
        <Step step={1} done={doneSteps.has(1)} errors={errorsFor(1)} title="Kategori & produk" hint="Menentukan crew yang menangani dan template checklist.">
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
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => {
                      setProductId(x.id);
                      pickTemplate(categoryId, x.id);
                    }}
                    aria-pressed={productId === x.id}
                    data-autofocus
                    className="chip h-10 gap-1.5"
                  >
                    <ProductIcon id={x.icon} className="size-4 opacity-70" />
                    {x.name}
                  </button>
                );
              })}
            </div>
          </div>
        </Step>

        {/* 2 — Detail */}
        <Step step={2} done={doneSteps.has(2)} errors={errorsFor(2)} title="Detail pekerjaan">
          <div className="space-y-2">
            <Label htmlFor="nt-title" className="text-[13px]">
              Judul
            </Label>
            <TextInput id="nt-title" data-autofocus invalid={attempted && title.trim().length < 3} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isTS ? "mis. Internet mati total" : "mis. Maintenance rutin ODC"} />
            {!title && (
              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]">
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
            <TextArea id="nt-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Informasi tambahan untuk teknisi, mis. patokan lokasi atau kontak di tempat." />
          </div>
        </Step>

        {/* 3 — Lokasi */}
        <Step step={3} done={doneSteps.has(3)} errors={errorsFor(3)} title={isTS ? "Pelanggan & lokasi" : "Lokasi"} hint="Titik lokasi dipakai untuk verifikasi check-in teknisi.">
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
                  data-autofocus
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
        <Step step={4} done={doneSteps.has(4)} errors={errorsFor(4)} title="Prioritas & jadwal" hint="Deadline dihitung otomatis dari SLA prioritas dan tetap bisa diubah.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {p.priorities.map((x) => (
              <button key={x.id} type="button" onClick={() => setPriorityId(x.id)} aria-pressed={priorityId === x.id} className="card-interactive rounded-xl px-3 py-2.5 text-left">
                <PriorityLabel level={x.level} name={x.name} className="text-[13.5px]" />
                <span className="tabular mt-1 block text-[12px] text-muted-foreground">SLA {sla(x.slaHours)}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
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
        <Step step={5} done={doneSteps.has(5)} errors={errorsFor(5)} title="Teknisi" hint={`Dari ${category?.groupName ?? "crew"}. Bisa lebih dari satu, mereka berbagi satu checklist dan satu laporan.`} count={assignees.length || undefined}>
          <TechnicianPicker key={category?.groupId} techs={techs} selected={assignees} onToggle={(id) => setAssignees((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))} />
        </Step>

        {/* 6 — Checklist */}
        <Step
          step={6}
          errors={errorsFor(6)}
          done={doneSteps.has(6) && items.length > 0}
          title="Checklist"
          count={items.length || undefined}
          hint={productId ? "Diisi dari template. Seret ⠿ untuk mengubah urutan, ubah tipe, atau hapus item khusus untuk task ini." : "Pilih produk di langkah 1 untuk memuat template."}
        >
          {items.length > 0 && (
            <Reorder.Group as="ol" axis="y" values={items} onReorder={setItems} className="space-y-2">
              {items.map((it, i) => (
                <ChecklistRow
                  key={it.uid}
                  item={it}
                  index={i}
                  onChange={(patch) => updateItem(i, patch)}
                  onMove={(d) => move(i, d)}
                  onRemove={() => setItems((arr) => arr.filter((x) => x.uid !== it.uid))}
                />
              ))}
            </Reorder.Group>
          )}
          <button
            type="button"
            onClick={() => setItems((a) => [...a, { uid: uid(), label: "", type: "tick", unit: "", required: true }])}
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
                      <span className={cn("size-1.5 shrink-0 rounded-full", attempted ? "bg-red-500" : "bg-amber-500")} />
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
      <div className="fixed inset-x-0 bottom-nav z-30 border-t border-foreground/[0.06] bg-background/85 px-4 pt-2.5 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {missing.length ? (
            <>
              <span className={cn("size-1.5 rounded-full", attempted ? "bg-red-500" : "bg-amber-500")} />
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

function Step({ step, done, errors = [], title, hint, count, children }: { step: number; done?: boolean; errors?: string[]; title: string; hint?: string; count?: number; children: React.ReactNode }) {
  const invalid = errors.length > 0;
  return (
    <section
      data-tour={`new-${step}`}
      data-invalid={invalid || undefined}
      className={cn(
        "scroll-mt-20 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-200 sm:p-5",
        invalid && "border-red-500/60 shadow-[0_0_0_4px_rgb(239_68_68/0.09)] dark:border-red-400/50 dark:shadow-[0_0_0_4px_rgb(248_113_113/0.1)]",
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            "tabular relative mt-px flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors duration-200 ease-[var(--ease-out)]",
            done ? "bg-emerald-500 text-white" : invalid ? "bg-red-500 text-white" : "bg-foreground/[0.07] text-foreground",
          )}
        >
          <span className={cn("transition-[opacity,transform] duration-200 ease-[var(--ease-out)]", done ? "scale-50 opacity-0" : "scale-100 opacity-100")}>{invalid ? "!" : step}</span>
          <Check className={cn("absolute size-3.5 transition-[opacity,transform] duration-200 ease-[var(--ease-out)]", done ? "scale-100 opacity-100" : "scale-50 opacity-0")} strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
            {title}
            {count ? <span className="tabular rounded-md bg-foreground/[0.06] px-1.5 text-[11.5px] font-medium text-muted-foreground">{count}</span> : null}
          </h2>
          {hint && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{hint}</p>}
          {invalid && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12.5px] font-medium leading-snug text-red-600 animate-in fade-in slide-in-from-top-1 duration-200 dark:text-red-400">
              <CircleAlert className="mt-px size-3.5 shrink-0" />
              {errors.join(" · ")}
            </p>
          )}
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

/** Satu item checklist: seret lewat pegangan ⠿ (mouse/jari), atau fokus pegangan lalu ↑/↓ di keyboard. */
function ChecklistRow({ item, index, onChange, onMove, onRemove }: { item: Draft; index: number; onChange: (p: Partial<Item>) => void; onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  return (
    <Reorder.Item
      as="li"
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      whileDrag={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 600, damping: 45 }}
      className={cn("relative rounded-xl border bg-card p-2.5 pl-1.5", dragging && "z-10 shadow-[var(--shadow-pop)] ring-1 ring-foreground/10")}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Ubah urutan item ${index + 1}. Seret, atau tekan panah atas/bawah`}
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
          className={cn("flex h-10 w-7 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground/60 outline-none transition-colors duration-150 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50", dragging ? "cursor-grabbing" : "cursor-grab")}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-[12px] font-semibold text-muted-foreground">{index + 1}</span>
        <Input
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className={cn("h-10 flex-1 rounded-lg border-transparent bg-foreground/[0.03] text-[14px] shadow-none focus-visible:bg-background", !item.label.trim() && "border-amber-500/40")}
          placeholder="Tulis item pekerjaan"
        />
        <IconButton icon={Trash2} label="Hapus item" className="hover:bg-red-500/10 hover:text-red-600" onClick={onRemove} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-[66px]">
        <Segmented label="Tipe item" options={TYPES} value={item.type} onChange={(type) => onChange({ type })} compactInactive />
        {item.type === "data" && <UnitSelect value={item.unit} onChange={(unit) => onChange({ unit })} />}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
          Wajib <Switch checked={item.required} onCheckedChange={(c) => onChange({ required: c })} />
        </label>
      </div>
    </Reorder.Item>
  );
}

const TECH_PAGE = 6;

/** Pilih teknisi: cari nama, urutkan dari beban paling ringan, halaman per 6, yang terpilih selalu terlihat di atas. */
function TechnicianPicker({ techs, selected, onToggle }: { techs: Props["technicians"]; selected: string[]; onToggle: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [lightFirst, setLightFirst] = useState(false);
  const [page, setPage] = useState(0);
  const term = q.trim().toLowerCase();
  const list = techs.filter((t) => !term || t.name.toLowerCase().includes(term));
  const sorted = lightFirst ? [...list].sort((a, b) => a.load - b.load || a.name.localeCompare(b.name)) : list;
  const pages = Math.max(1, Math.ceil(sorted.length / TECH_PAGE));
  const current = Math.min(page, pages - 1);
  const shown = sorted.slice(current * TECH_PAGE, current * TECH_PAGE + TECH_PAGE);
  const chosen = techs.filter((t) => selected.includes(t.id));

  if (!techs.length) return <p className="rounded-xl border border-dashed px-4 py-5 text-center text-[13px] text-muted-foreground">Belum ada teknisi di crew ini.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(0);
          }}
          placeholder="Cari nama teknisi"
          data-autofocus
          className="min-w-[200px]"
        />
        <button
          type="button"
          aria-pressed={lightFirst}
          onClick={() => {
            setLightFirst((v) => !v);
            setPage(0);
          }}
          className="chip h-11 shrink-0 gap-1.5"
        >
          <ArrowDownWideNarrow className="size-4 opacity-70" />
          Paling longgar dulu
        </button>
      </div>

      {chosen.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[12px] text-muted-foreground">Dipilih</span>
          {chosen.map((t) => (
            <span key={t.id} className="flex h-8 items-center gap-1.5 rounded-full border bg-card pl-1 pr-1 text-[12.5px] font-medium">
              <Avatar id={t.id} name={t.name} size="sm" />
              {t.name.split(" ")[0]}
              <button type="button" aria-label={`Lepas ${t.name}`} onClick={() => onToggle(t.id)} className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {shown.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-2">
          {shown.map((t) => {
            const on = selected.includes(t.id);
            const busy = t.load >= 4 ? "Padat" : t.load >= 2 ? "Sedang" : "Longgar";
            return (
              <button key={t.id} type="button" onClick={() => onToggle(t.id)} aria-pressed={on} className="card-interactive flex items-center gap-3 rounded-xl p-3 text-left">
                <Avatar id={t.id} name={t.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{t.name}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="flex gap-0.5" aria-hidden>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span key={i} className={cn("h-1.5 w-2.5 rounded-full", i < Math.min(t.load, 5) ? (t.load >= 4 ? "bg-amber-500" : "bg-foreground/40") : "bg-foreground/10")} />
                      ))}
                    </span>
                    <span className="tabular whitespace-nowrap text-[12px] text-muted-foreground">
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
        </div>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-5 text-center text-[13px] text-muted-foreground">Tidak ada teknisi bernama “{q.trim()}”.</p>
      )}

      {sorted.length > TECH_PAGE && (
        <div className="flex items-center justify-between gap-3">
          <p className="tabular text-[12.5px] text-muted-foreground">
            {current * TECH_PAGE + 1}–{Math.min(sorted.length, (current + 1) * TECH_PAGE)} dari {sorted.length} teknisi
          </p>
          <div className="flex items-center gap-1">
            <IconButton icon={ChevronLeft} label="Halaman sebelumnya" variant="subtle" disabled={current === 0} onClick={() => setPage(current - 1)} />
            <span className="tabular min-w-12 text-center text-[12.5px] font-medium">
              {current + 1} / {pages}
            </span>
            <IconButton icon={ChevronRight} label="Halaman berikutnya" variant="subtle" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} />
          </div>
        </div>
      )}
    </div>
  );
}

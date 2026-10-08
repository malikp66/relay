import { requireUser } from "@/server/auth";
import Link from "next/link";
import { and, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import { ChevronRight, FileText, Gauge, History, ListChecks, MapPin, Network, Package, Tags, UserRound, Users, Contact, type LucideIcon } from "lucide-react";
import { getDb, schema as s } from "@/db";
import { Avatar } from "@/components/relay/avatar-stack";
import { EmptyState } from "@/components/relay/page";
import { FilterChips } from "@/components/relay/filter-chips";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { nowMs } from "@/lib/clock";
import { AuditSearch } from "./audit-search";

export const metadata = { title: "Audit log" };

/** Nama data, ikon, dan halaman tempat data itu dikelola. */
const ENTITY: Record<string, { label: string; icon: LucideIcon; href?: string }> = {
  user: { label: "User", icon: Users, href: "/admin/users" },
  group: { label: "Crew", icon: Network, href: "/admin/groups" },
  categories: { label: "Kategori", icon: Tags, href: "/admin/master" },
  products: { label: "Produk", icon: Package, href: "/admin/master" },
  priorities: { label: "Prioritas & SLA", icon: Gauge, href: "/admin/master" },
  customers: { label: "Pelanggan", icon: Contact, href: "/admin/locations" },
  sites: { label: "Lokasi", icon: MapPin, href: "/admin/locations" },
  checklist_template: { label: "Template checklist", icon: ListChecks, href: "/templates" },
  report_template: { label: "Template laporan", icon: FileText, href: "/templates" },
};
/** Label aksi + warna sesuai sifatnya: menambah (hijau), mengubah (biru), menghapus/menonaktifkan (merah/kuning). */
const ACTION: Record<string, { label: string; tone: string }> = {
  create: { label: "Tambah", tone: "bg-emerald-500" },
  add_item: { label: "Tambah item", tone: "bg-emerald-500" },
  activate: { label: "Aktifkan", tone: "bg-emerald-500" },
  import: { label: "Import", tone: "bg-emerald-500" },
  update: { label: "Ubah", tone: "bg-sky-500" },
  reorder: { label: "Ubah urutan", tone: "bg-sky-500" },
  move_member: { label: "Pindah crew", tone: "bg-sky-500" },
  reset_password: { label: "Reset password", tone: "bg-amber-500" },
  deactivate: { label: "Nonaktifkan", tone: "bg-amber-500" },
  delete: { label: "Hapus", tone: "bg-red-500" },
  delete_item: { label: "Hapus item", tone: "bg-red-500" },
};
const ACTION_GROUPS: Record<string, { name: string; actions: string[] }> = {
  add: { name: "Tambah", actions: ["create", "add_item", "activate", "import"] },
  change: { name: "Ubah", actions: ["update", "reorder", "move_member", "reset_password"] },
  remove: { name: "Hapus / nonaktifkan", actions: ["delete", "delete_item", "deactivate"] },
};
const PAGE = 50;
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireUser(["admin"]);
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const f = { entity: str("entity"), action: str("action"), actor: str("actor"), q: str("q") };
  const limit = Math.min(Math.max(Number(str("n")) || PAGE, PAGE), 1000);

  const db = await getDb();
  const where: SQL[] = [];
  if (f.entity) where.push(eq(s.auditLogs.entity, f.entity));
  if (f.actor) where.push(eq(s.auditLogs.actorId, f.actor));
  if (f.q) where.push(ilike(s.auditLogs.summary, `%${f.q.replace(/[%_]/g, "")}%`));
  const actions = f.action ? ACTION_GROUPS[f.action]?.actions : undefined;
  const cond = and(...where);

  const [rows, [{ total }], actors] = await Promise.all([
    db
      .select({ log: s.auditLogs, actorName: s.users.name })
      .from(s.auditLogs)
      .leftJoin(s.users, eq(s.users.id, s.auditLogs.actorId))
      .where(cond)
      .orderBy(desc(s.auditLogs.createdAt))
      .limit(actions ? 1000 : limit),
    db.select({ total: count() }).from(s.auditLogs).where(cond),
    db.selectDistinct({ id: s.users.id, name: s.users.name }).from(s.auditLogs).innerJoin(s.users, eq(s.users.id, s.auditLogs.actorId)),
  ]);
  // filter aksi dikelompokkan (beberapa kode aksi per grup) → disaring di sini
  const filtered = actions ? rows.filter((r) => actions.includes(r.log.action)) : rows;
  const shown = filtered.slice(0, limit);
  const totalShown = actions ? filtered.length : total;
  const active = Object.values(f).some(Boolean);

  const today = ymd(new Date(nowMs()));
  const yesterday = ymd(new Date(nowMs() - 864e5));
  const days = new Map<string, typeof shown>();
  for (const r of shown) {
    const k = ymd(r.log.createdAt);
    days.set(k, [...(days.get(k) ?? []), r]);
  }
  const dayLabel = (k: string) => (k === today ? "Hari ini" : k === yesterday ? "Kemarin" : fmtDate(new Date(`${k}T12:00:00+07:00`), { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  const more = new URLSearchParams(Object.entries({ ...f, n: String(limit + PAGE) }).filter(([, v]) => v) as [string, string][]);

  return (
    <div className="space-y-4">
      <div data-tour="audit-filters" className="space-y-3">
        <AuditSearch />
        <FilterChips
          filters={[
            { key: "entity", label: "Jenis data", options: Object.entries(ENTITY).map(([id, e]) => ({ id, name: e.label })) },
            { key: "action", label: "Aksi", options: Object.entries(ACTION_GROUPS).map(([id, g]) => ({ id, name: g.name })) },
            { key: "actor", label: "Pelaku", options: actors.sort((a, b) => a.name.localeCompare(b.name)) },
          ]}
        />
      </div>
      <p className="tabular px-0.5 text-[12.5px] text-muted-foreground">
        {totalShown ? `Menampilkan ${shown.length} dari ${totalShown} aktivitas${active ? " (terfilter)" : ""}` : ""}
      </p>

      {shown.length ? (
        <div data-tour="audit-list" className="space-y-5">
          {[...days.entries()].map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 px-0.5 text-[13px] font-medium text-muted-foreground">{dayLabel(day)}</h2>
              <ol className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
                {list.map(({ log, actorName }) => {
                  const ent = ENTITY[log.entity] ?? { label: log.entity, icon: History };
                  const act = ACTION[log.action] ?? { label: log.action, tone: "bg-foreground/40" };
                  return (
                    <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                      {actorName && log.actorId ? (
                        <Avatar id={log.actorId} name={actorName} />
                      ) : (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground">
                          <UserRound className="size-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-snug">
                          <span className="font-medium">{actorName ?? "Sistem"}</span> <span className="text-foreground/85">{sentence(log.summary ?? act.label)}</span>
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className={cn("size-1.5 rounded-full", act.tone)} />
                            {act.label}
                          </span>
                          <span className="flex items-center gap-1">
                            <ent.icon className="size-3.5" />
                            {ent.label}
                          </span>
                          <span className="tabular">{fmtTime(log.createdAt)}</span>
                        </p>
                      </div>
                      {ent.href && (
                        <Link href={ent.href} aria-label={`Buka ${ent.label}`} className="press -mr-1 flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
                          Buka <ChevronRight className="size-3.5" />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {shown.length < totalShown && (
            <Link href={`/admin/audit?${more}`} scroll={false} className="press flex h-11 items-center justify-center rounded-xl border bg-card text-[13.5px] font-medium shadow-[var(--shadow-card)] transition-colors hover:bg-foreground/[0.03]">
              Muat {Math.min(PAGE, totalShown - shown.length)} aktivitas lagi
            </Link>
          )}
        </div>
      ) : (
        <EmptyState icon={History} title={active ? "Tidak ada aktivitas yang cocok" : "Belum ada aktivitas"} description={active ? "Coba ubah atau reset filter." : "Perubahan master data, user, dan template akan tercatat di sini."} />
      )}
    </div>
  );
}

/** Istilah teknis di catatan lama → bahasa sehari-hari (catatan baru sudah memakai label ini). */
const LEGACY: [RegExp, string][] = [
  [/\(technician\)/g, "(Teknisi)"],
  [/\(supervisor\)/g, "(Supervisor)"],
  [/\(admin\)/g, "(Admin)"],
];
const NOUN: Record<string, string> = { categories: "kategori", products: "produk", priorities: "prioritas", customers: "pelanggan", sites: "lokasi" };

/** "Mengubah lokasi X" → "mengubah lokasi X" agar terbaca sebagai kalimat setelah nama pelaku. */
function sentence(t: string) {
  let out = t.replace(/\b(categories|products|priorities|customers|sites):\s*/g, (_, k: string) => `${NOUN[k]} `);
  for (const [re, to] of LEGACY) out = out.replace(re, to);
  out = out.replace(/^Menghapus (categories|products|priorities|customers|sites)$/, (_, k: string) => `Menghapus ${NOUN[k]}`);
  return /^[A-Z][a-z]/.test(out) ? out[0].toLowerCase() + out.slice(1) : out;
}

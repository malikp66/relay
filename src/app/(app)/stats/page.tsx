import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getStats } from "@/server/stats";
import { masterData, startOfDay, technicians } from "@/server/queries";
import { nowMs } from "@/lib/clock";
import { Metrics, PageHeader, Panel, Section } from "@/components/relay/page";
import { Avatar } from "@/components/relay/avatar-stack";
import { BarList } from "@/components/relay/bar-list";
import { StatsFilters } from "./filters";
import { ThroughputChart } from "./charts";
import { cn } from "@/lib/utils";

export const metadata = { title: "Statistik" };

const hours = (h: number) => (h >= 24 ? `${(h / 24).toFixed(1)} hari` : `${h.toFixed(1)} jam`);
const pct = (v: number) => `${Math.round(v * 100)}%`;

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const user = await requireUser(["admin", "supervisor"]);
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const range = Number(one("range") ?? 30);
  const to = new Date(nowMs());
  const from = startOfDay(new Date(nowMs() - (range - 1) * 864e5));
  const [stats, md, techs] = await Promise.all([
    getStats(user, { from, to, groupId: one("group"), categoryId: one("category"), productId: one("product"), technicianId: one("tech") }),
    masterData(),
    technicians(user.role === "supervisor" ? user.supervisedGroupIds : undefined),
  ]);
  const { throughput: tp, timing, quality, attendance } = stats;
  const compliance = timing.total ? 1 - timing.breached / timing.total : 1;
  const completion = tp.finished + tp.open ? tp.finished / (tp.finished + tp.open) : 0;

  return (
    <div className="space-y-8">
      <div>
        <PageHeader title="Statistik" subtitle={`${user.role === "supervisor" ? user.groupNames.join(", ") : "Semua crew"} · ${range} hari terakhir`} className="mb-5" />
        <StatsFilters
          options={{
            groups: user.role === "admin" ? md.groups.filter((g) => g.parentId).map((g) => ({ id: g.id, name: g.name })) : [],
            categories: md.categories.map((c) => ({ id: c.id, name: c.name })),
            products: md.products.map((p) => ({ id: p.id, name: p.name })),
            techs: techs.map((t) => ({ id: t.id, name: t.name })),
          }}
        />
      </div>

      <Section title="Throughput">
        <Metrics
          cols={4}
          items={[
            { label: "Selesai", value: tp.finished, hint: "task Finished" },
            { label: "Dibuat", value: tp.created, hint: "task baru" },
            { label: "Masih terbuka", value: tp.open, hint: "belum Finished" },
            { label: "Tingkat selesai", value: pct(completion), hint: "selesai ÷ (selesai + terbuka)" },
          ]}
        />
        <Panel
          title="Dibuat vs selesai per hari"
          action={
            <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-0 w-3 border-t-2 border-dashed border-zinc-400" /> Dibuat
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full bg-primary" /> Selesai
              </span>
            </div>
          }
        >
          <ThroughputChart data={tp.series} />
        </Panel>
        <div className={cn("grid gap-3", tp.byGroup.length > 1 && "md:grid-cols-2")}>
          <Panel title="Per produk">
            <BarList items={tp.byProduct.map((r) => ({ label: r.label, value: r.finished, secondary: r.open }))} valueLabel="Selesai" secondaryLabel="Terbuka" />
          </Panel>
          {tp.byGroup.length > 1 && (
            <Panel title="Per crew">
              <BarList items={tp.byGroup.map((r) => ({ label: r.label, value: r.finished, secondary: r.open }))} valueLabel="Selesai" secondaryLabel="Terbuka" />
            </Panel>
          )}
        </div>
      </Section>

      <Section title="Waktu & SLA" description="Rata-rata durasi tiap fase untuk task yang selesai di periode ini.">
        <Metrics
          cols={3}
          items={[
            { label: "Assigned → Job Done", value: hours(timing.toJobDone) },
            { label: "Assigned → Finished", value: hours(timing.toFinished) },
            { label: "Kerja lapangan", value: hours(timing.fieldWork), hint: "In Progress → Job Done" },
            { label: "Jeda laporan", value: hours(timing.paperwork), hint: "Job Done → Submitted", tone: timing.paperwork > 6 ? "warning" : "default" },
            { label: "SLA tercapai", value: pct(compliance), hint: `${timing.breached} dari ${timing.total} lewat SLA`, tone: compliance < 0.9 ? "warning" : "success" },
            { label: "Overdue saat ini", value: timing.overdue, hint: "belum Job Done & lewat deadline", tone: timing.overdue ? "danger" : "default" },
          ]}
        />
      </Section>

      <Section title="Kualitas laporan" description="Seberapa sering laporan dikembalikan untuk revisi.">
        <Metrics
          cols={2}
          items={[
            { label: "Rata-rata revisi", value: quality.avgRev.toFixed(2), hint: "per task selesai", tone: quality.avgRev >= 0.6 ? "warning" : "default" },
            { label: "Lolos tanpa revisi", value: pct(quality.firstPass), hint: "approve di review pertama" },
          ]}
        />
        <DataTable
          head={["Teknisi", "Revisi", "Lolos"]}
          rows={quality.perTech.map((q) => ({
            key: q.id,
            cells: [
              <Person key="p" id={q.id} name={q.name} sub={`${q.tasks} task · ${q.group_name ?? "-"}`} />,
              <span key="r" className={cn("tabular font-semibold", q.avg_rev >= 0.8 ? "text-red-600 dark:text-red-400" : q.avg_rev >= 0.4 ? "text-amber-600 dark:text-amber-400" : "")}>
                {Number(q.avg_rev).toFixed(2)}
              </span>,
              <span key="l" className="tabular">
                {pct(Number(q.first_pass))}
              </span>,
            ],
          }))}
        />
        {quality.topRevisions.length > 0 && (
          <Panel title="Revisi terbanyak">
            <ul className="-my-1 divide-y">
              {quality.topRevisions.map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="group flex items-center gap-3 py-2.5 text-[13.5px]">
                    <span className="tabular w-8 shrink-0 rounded-md bg-red-500/10 py-0.5 text-center text-[12px] font-semibold text-red-600 dark:text-red-400">{t.revision_count}×</span>
                    <span className="min-w-0 flex-1 truncate group-hover:underline">{t.title}</span>
                    <span className="hidden font-mono text-[11.5px] text-muted-foreground sm:inline">{t.code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </Section>

      <Section title="Absensi" description="Kepatuhan = check-in valid (dalam radius) ÷ task dikerjakan. Telat = check-in >15 menit dari jadwal.">
        <DataTable
          head={["Teknisi", "Kepatuhan", "Telat"]}
          rows={attendance.map((a) => ({
            key: a.id,
            cells: [
              <Person key="p" id={a.id} name={a.name} sub={`${a.checkins} check-in`} />,
              <div key="c" className="flex items-center justify-end gap-2.5">
                <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-foreground/[0.07] sm:block">
                  <span className={cn("block h-full rounded-full", a.compliance >= 0.9 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: pct(a.compliance) }} />
                </span>
                <span className="tabular w-10 text-right font-semibold">{pct(a.compliance)}</span>
              </div>,
              <span key="l" className={cn("tabular", a.lateRate > 0.2 && "font-semibold text-amber-600 dark:text-amber-400")}>
                {pct(a.lateRate)}
              </span>,
            ],
          }))}
        />
      </Section>
    </div>
  );
}

function Person({ id, name, sub }: { id: string; name: string; sub: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar id={id} name={name} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-medium">{name}</span>
        <span className="block truncate text-[12px] text-muted-foreground">{sub}</span>
      </span>
    </span>
  );
}

function DataTable({ head, rows }: { head: string[]; rows: { key: string; cells: React.ReactNode[] }[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_64px] items-center gap-x-4 border-b bg-foreground/[0.02] px-4 py-2.5 text-[12px] font-medium text-muted-foreground sm:px-5">
        {head.map((h, i) => (
          <span key={h} className={i ? "text-right" : ""}>
            {h}
          </span>
        ))}
      </div>
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto_64px] items-center gap-x-4 px-4 py-2.5 text-[13.5px] sm:px-5">
            {r.cells.map((c, i) => (
              <div key={i} className={i ? "text-right" : "min-w-0"}>
                {c}
              </div>
            ))}
          </li>
        ))}
        {!rows.length && <li className="px-5 py-6 text-center text-[13px] text-muted-foreground">Belum ada data di periode ini.</li>}
      </ul>
    </div>
  );
}

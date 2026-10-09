import Link from "next/link";
import { nowMs } from "@/lib/clock";
import { and, gte, inArray, sql } from "drizzle-orm";
import { ArrowRight, CheckCircle2, ClipboardCheck, FileWarning, MapPin, Timer, Users } from "lucide-react";
import { getDb, schema as s } from "@/db";
import { requireUser, type CurrentUser } from "@/server/auth";
import { andAll, taskScope } from "@/server/policy";
import { countByStatus, listTasks, myOpenAttendance, overdueCount, startOfDay, teamLoad } from "@/server/queries";
import { TaskCard } from "@/components/relay/task-card";
import { EmptyState, Metrics, Section } from "@/components/relay/page";
import { ProgressRings } from "@/components/relay/progress-ring";
import { Avatar } from "@/components/relay/avatar-stack";
import { LinkCard } from "@/components/relay/link-card";
import { SetupChecklist } from "@/components/relay/setup-checklist";
import { HelpButton } from "@/components/tour/help-button";
import { setupItems } from "@/server/setup";
import { fmtLongDate, fmtTime } from "@/lib/format";
import type { CSSProperties } from "react";
import { STATUS_META } from "@/lib/labels";
import type { TaskStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

export const metadata = { title: "Beranda" };

export default async function DashboardPage() {
  const user = await requireUser();
  const setup = await setupItems(user);
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">{fmtLongDate(new Date())}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Halo, {user.name.split(" ")[0]}</h1>
          <HelpButton className="translate-y-px" />
        </div>
      </div>
      <SetupChecklist userId={user.id} role={user.role} items={setup} />
      {user.role === "technician" ? <TechnicianHome user={user} /> : user.role === "supervisor" ? <SupervisorHome user={user} /> : <AdminHome user={user} />}
    </div>
  );
}

/* ───────────── Teknisi ───────────── */

async function TechnicianHome({ user }: { user: CurrentUser }) {
  const [open, active, done] = await Promise.all([myOpenAttendance(user.id), listTasks(user, { view: "active" }), finishedSince(user, startOfDay())]);
  const revision = active.filter((t) => t.status === "revision");
  const field = active.filter((t) => ["assigned", "in_progress"].includes(t.status));
  const paperwork = active.filter((t) => t.status === "job_done");
  const waiting = active.filter((t) => ["submitted", "under_review"].includes(t.status));
  const todayTotal = field.length + paperwork.length + done;

  return (
    <>
      <div data-tour="home-summary" className="flex items-center gap-5 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <ProgressRings
          size={104}
          stroke={11}
          rings={[
            { value: done + paperwork.length + waiting.length, max: Math.max(todayTotal + waiting.length, 1), color: "#2563eb" },
            { value: done, max: Math.max(todayTotal, 1), color: "#10b981" },
          ]}
        >
          <span className="tabular text-xl font-semibold leading-none">{field.length}</span>
          <span className="text-[10px] text-muted-foreground">tersisa</span>
        </ProgressRings>
        <div className="grid flex-1 gap-2.5 text-[13.5px]">
          <Legend color="bg-blue-600" label="Kerja lapangan selesai" value={done + paperwork.length + waiting.length} />
          <Legend color="bg-emerald-500" label="Selesai hari ini" value={done} />
          <Legend color="bg-red-500" label="Perlu revisi" value={revision.length} />
        </div>
      </div>

      {open ? (
        <Link href={`/tasks/${open.taskId}`} style={{ "--tint": "#2563eb" } as CSSProperties} data-selected="true" className="card-interactive group flex items-center gap-3 rounded-2xl px-4 py-3.5">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-blue-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold">Sedang di lokasi · sejak {fmtTime(open.a.checkInAt)}</p>
            <p className="truncate text-[12.5px] text-muted-foreground">
              {open.taskCode} · {open.taskTitle}
            </p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-foreground/15 px-4 py-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
          <MapPin className="mt-0.5 size-[18px] shrink-0" />
          Belum check-in. Buka tugas lalu tahan tombol <b className="text-foreground">Check-in</b> saat tiba di lokasi.
        </div>
      )}

      {revision.length > 0 && (
        <Section title="Perlu revisi" count={revision.length}>
          <div className="grid gap-3 md:grid-cols-2">{revision.map((t) => <TaskCard key={t.id} task={t} />)}</div>
        </Section>
      )}

      <Section title="Tugas lapangan" count={field.length} action={<Link href="/tasks" className="text-primary hover:underline">Lihat semua</Link>}>
        {field.length ? (
          <div className="grid gap-3 md:grid-cols-2">{field.map((t) => <TaskCard key={t.id} task={t} />)}</div>
        ) : (
          <EmptyState icon={CheckCircle2} title="Tidak ada tugas lapangan" description="Tugas baru dari supervisor akan muncul di sini." />
        )}
      </Section>

      {paperwork.length > 0 && (
        <Section title="Laporan belum dikirim" count={paperwork.length}>
          <div className="grid gap-3 md:grid-cols-2">{paperwork.map((t) => <TaskCard key={t.id} task={t} />)}</div>
        </Section>
      )}
      {waiting.length > 0 && (
        <Section title="Menunggu review" count={waiting.length}>
          <div className="grid gap-3 md:grid-cols-2">{waiting.map((t) => <TaskCard key={t.id} task={t} />)}</div>
        </Section>
      )}
    </>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2.5 rounded-full", color)} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="tabular font-semibold">{value}</span>
    </div>
  );
}

async function finishedSince(user: CurrentUser, since: Date) {
  const db = await getDb();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.tasks)
    .where(andAll(taskScope(user), inArray(s.tasks.status, ["submitted", "under_review", "finished", "approved"]), gte(s.tasks.jobDoneAt, since)));
  return r.n;
}

/* ───────────── Supervisor ───────────── */

async function SupervisorHome({ user }: { user: CurrentUser }) {
  const [counts, overdue, review, load, weekDone, paperwork] = await Promise.all([
    countByStatus(user),
    overdueCount(user),
    listTasks(user, { view: "review", limit: 4 }),
    teamLoad(user.supervisedGroupIds),
    finishedSinceAny(user, new Date(nowMs() - 7 * 864e5)),
    listTasks(user, { status: ["job_done"] }),
  ]);
  const lagging = paperwork.filter((t) => nowMs() - new Date(t.scheduledFor ?? t.createdAt).getTime() > 24 * 3600_000);
  const onSite = load.filter((m) => m.onSite).length;

  return (
    <>
      <Metrics
        data-tour="home-summary"
        items={[
          { label: "Antrian review", value: (counts.submitted ?? 0) + (counts.under_review ?? 0), hint: "menunggu keputusan" },
          { label: "Overdue", value: overdue, hint: "lewat deadline", tone: overdue ? "danger" : "default" },
          { label: "Di lapangan", value: `${onSite}/${load.length}`, hint: "teknisi check-in" },
          { label: "Selesai 7 hari", value: weekDone, hint: "task Finished" },
        ]}
      />

      <Section title="Antrian review" count={review.length} action={<Link href="/review" className="text-primary hover:underline">Buka antrian</Link>}>
        {review.length ? (
          <div className="grid gap-3 md:grid-cols-2">{review.map((t) => <TaskCard key={t.id} task={t} />)}</div>
        ) : (
          <EmptyState icon={ClipboardCheck} title="Antrian kosong" description="Laporan yang dikirim teknisi akan muncul di sini." />
        )}
      </Section>

      <Section title="Beban tim">
        <TeamLoadList load={load} />
      </Section>

      {lagging.length > 0 && (
        <Section title="Laporan tertunda" description="Kerja lapangan selesai lebih dari 24 jam, laporan belum dikirim." count={lagging.length}>
          <div className="rounded-2xl border bg-card">
            {lagging.map((t) => (
              <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                <FileWarning className="size-4 text-amber-500" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{t.code}</span> {t.title}
                </span>
                <span className="text-xs text-muted-foreground">{t.assignees.map((a) => a.name.split(" ")[0]).join(", ")}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

async function finishedSinceAny(user: CurrentUser, since: Date) {
  const db = await getDb();
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(s.tasks).where(andAll(taskScope(user), and(inArray(s.tasks.status, ["finished"]), gte(s.tasks.finishedAt, since))));
  return r.n;
}

const LOAD_ORDER: TaskStatus[] = ["assigned", "in_progress", "job_done", "submitted", "under_review", "revision"];

function TeamLoadList({ load }: { load: Awaited<ReturnType<typeof teamLoad>> }) {
  const max = Math.max(...load.map((m) => m.active), 1);
  return (
    <div className="divide-y rounded-2xl border bg-card">
      {load.map((m) => (
        <div key={m.id} className="flex items-center gap-3 px-4 py-3">
          <Avatar id={m.id} name={m.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{m.name}</span>
              {m.onSite && <span className="rounded-full bg-blue-50 px-1.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">di lokasi</span>}
            </div>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted" style={{ width: `${Math.max((m.active / max) * 100, 4)}%` }}>
              {LOAD_ORDER.map((st) => (m.byStatus[st] ? <span key={st} className={STATUS_META[st].dot} style={{ flex: m.byStatus[st] }} title={`${STATUS_META[st].label}: ${m.byStatus[st]}`} /> : null))}
            </div>
          </div>
          <span className="tabular w-8 text-right text-sm font-semibold">{m.active}</span>
        </div>
      ))}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-2.5 text-[11px] text-muted-foreground">
        {LOAD_ORDER.map((st) => (
          <span key={st} className="flex items-center gap-1">
            <span className={cn("size-2 rounded-full", STATUS_META[st].dot)} />
            {STATUS_META[st].label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Admin ───────────── */

async function AdminHome({ user }: { user: CurrentUser }) {
  const db = await getDb();
  const [counts, overdue, load, weekDone] = await Promise.all([countByStatus(user), overdueCount(user), teamLoad(), finishedSinceAny(user, new Date(nowMs() - 7 * 864e5))]);
  const groups = await db
    .select({ id: s.groups.id, name: s.groups.name, description: s.groups.description, status: s.tasks.status, n: sql<number>`count(${s.tasks.id})::int` })
    .from(s.groups)
    .leftJoin(s.tasks, sql`${s.tasks.groupId} = ${s.groups.id} and ${s.tasks.status} not in ('finished','cancelled')`)
    .where(sql`${s.groups.parentId} is not null`)
    .groupBy(s.groups.id, s.tasks.status);
  const [avgRev] = await db.select({ v: sql<number>`coalesce(avg(${s.tasks.revisionCount}),0)::float` }).from(s.tasks).where(sql`${s.tasks.status} = 'finished'`);
  const crews = Object.values(
    groups.reduce<Record<string, { id: string; name: string; description: string | null; byStatus: Partial<Record<TaskStatus, number>>; total: number }>>((acc, r) => {
      acc[r.id] ??= { id: r.id, name: r.name, description: r.description, byStatus: {}, total: 0 };
      if (r.status) {
        acc[r.id].byStatus[r.status] = r.n;
        acc[r.id].total += r.n;
      }
      return acc;
    }, {}),
  );
  const active = Object.entries(counts).filter(([k]) => !["finished", "cancelled"].includes(k)).reduce((a, [, v]) => a + (v ?? 0), 0);

  return (
    <>
      <Metrics
        data-tour="home-summary"
        items={[
          { label: "Task aktif", value: active, hint: "semua crew" },
          { label: "Overdue", value: overdue, hint: "lewat deadline", tone: overdue ? "danger" : "default" },
          { label: "Selesai 7 hari", value: weekDone, hint: "task Finished" },
          { label: "Rata-rata revisi", value: avgRev.v.toFixed(2), hint: "per task selesai" },
        ]}
      />

      <Section title="Per crew">
        <div className="grid gap-3 md:grid-cols-2">
          {crews.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
                <span className="tabular text-2xl font-semibold">{c.total}</span>
              </div>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted">
                {LOAD_ORDER.map((st) => (c.byStatus[st] ? <span key={st} className={STATUS_META[st].dot} style={{ flex: c.byStatus[st] }} /> : null))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                {LOAD_ORDER.map((st) => (
                  <div key={st} className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={cn("size-2 rounded-full", STATUS_META[st].dot)} />
                    <span className="truncate">{STATUS_META[st].label}</span>
                    <span className="tabular ml-auto font-medium text-foreground">{c.byStatus[st] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Beban teknisi">
        <TeamLoadList load={load} />
      </Section>

      <div className="grid gap-3 md:grid-cols-3">
        <LinkCard href="/stats" icon={Timer} color="#059669" title="Statistik lengkap" description="Throughput, SLA, revisi, absensi per crew & teknisi." />
        <LinkCard href="/admin" icon={Users} color="#2563eb" title="Master data" description="User, crew & org tree, lokasi, referensi." />
        <LinkCard href="/review" icon={ClipboardCheck} color="#7c3aed" title="Antrian review" description="Semua laporan yang menunggu keputusan supervisor." />
      </div>
    </>
  );
}

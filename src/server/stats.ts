import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import type { CurrentUser } from "./auth";
import { andAll, taskScope } from "./policy";

export type StatsFilter = { from: Date; to: Date; groupId?: string; categoryId?: string; productId?: string; technicianId?: string };

const n = (v: unknown) => Number(v ?? 0);

/** Definisi metrik mengikuti RENCANA §10. */
export async function getStats(user: CurrentUser, f: StatsFilter) {
  const db = await getDb();
  const base = andAll(
    taskScope(user),
    sql`${s.tasks.status} <> 'cancelled'`,
    f.groupId ? sql`${s.tasks.groupId} = ${f.groupId}` : undefined,
    f.categoryId ? sql`${s.tasks.categoryId} = ${f.categoryId}` : undefined,
    f.productId ? sql`${s.tasks.productId} = ${f.productId}` : undefined,
    f.technicianId ? sql`exists (select 1 from task_assignees ta where ta.task_id = ${s.tasks.id} and ta.user_id = ${f.technicianId})` : undefined,
  ) ?? sql`true`;
  const inRange = (col: SQL) => sql`${col} between ${f.from.toISOString()} and ${f.to.toISOString()}`;

  /* Throughput */
  const [tp] = (
    await db.execute(sql`
    select
      count(*) filter (where ${inRange(sql`finished_at`)})::int as finished,
      count(*) filter (where ${inRange(sql`created_at`)})::int as created,
      count(*) filter (where status not in ('finished','cancelled'))::int as open
    from tasks where ${base}`)
  ).rows as Record<string, unknown>[];

  const series = (
    await db.execute(sql`
    with days as (
      select generate_series(date_trunc('day', ${f.from.toISOString()}::timestamptz at time zone 'Asia/Jakarta'), date_trunc('day', ${f.to.toISOString()}::timestamptz at time zone 'Asia/Jakarta'), interval '1 day') as d
    )
    select to_char(d, 'YYYY-MM-DD') as day,
      (select count(*) from tasks where ${base} and date_trunc('day', created_at at time zone 'Asia/Jakarta') = d)::int as created,
      (select count(*) from tasks where ${base} and date_trunc('day', finished_at at time zone 'Asia/Jakarta') = d)::int as finished
    from days order by d`)
  ).rows as { day: string; created: number; finished: number }[];

  const byProduct = (
    await db.execute(sql`
    select p.name as label,
      count(*) filter (where ${inRange(sql`t.finished_at`)})::int as finished,
      count(*) filter (where t.status not in ('finished','cancelled'))::int as open
    from tasks t join products p on p.id = t.product_id
    where ${sql.raw("true")} and t.id in (select id from tasks where ${base})
    group by p.name order by finished desc`)
  ).rows as { label: string; finished: number; open: number }[];

  const byGroup = (
    await db.execute(sql`
    select g.name as label,
      count(*) filter (where ${inRange(sql`t.finished_at`)})::int as finished,
      count(*) filter (where t.status not in ('finished','cancelled'))::int as open
    from tasks t join groups g on g.id = t.group_id
    where t.id in (select id from tasks where ${base})
    group by g.name order by g.name`)
  ).rows as { label: string; finished: number; open: number }[];

  /* Timing & SLA (task selesai dalam rentang) */
  const [timing] = (
    await db.execute(sql`
    select
      avg(extract(epoch from (job_done_at - created_at)) / 3600)::float as to_job_done,
      avg(extract(epoch from (finished_at - created_at)) / 3600)::float as to_finished,
      avg(extract(epoch from (job_done_at - started_at)) / 3600)::float as field_work,
      avg(extract(epoch from (submitted_at - job_done_at)) / 3600)::float as paperwork,
      count(*) filter (where job_done_at > due_at)::int as breached,
      count(*)::int as total
    from tasks where ${base} and ${inRange(sql`finished_at`)}`)
  ).rows as Record<string, unknown>[];
  const [overdue] = (
    await db.execute(sql`select count(*)::int as n from tasks where ${base} and status in ('assigned','in_progress') and due_at < now()`)
  ).rows as { n: number }[];

  /* Kualitas */
  const quality = (
    await db.execute(sql`
    select u.id, u.name, g.name as group_name,
      count(*)::int as tasks,
      avg(t.revision_count)::float as avg_rev,
      (count(*) filter (where t.revision_count = 0))::float / nullif(count(*),0) as first_pass
    from tasks t
    join task_assignees ta on ta.task_id = t.id
    join users u on u.id = ta.user_id
    left join group_members gm on gm.user_id = u.id
    left join groups g on g.id = gm.group_id
    where t.status = 'finished' and ${inRange(sql`t.finished_at`)} and t.id in (select id from tasks where ${base})
    group by u.id, u.name, g.name order by avg_rev desc`)
  ).rows as { id: string; name: string; group_name: string; tasks: number; avg_rev: number; first_pass: number }[];

  const topRevisions = (
    await db.execute(sql`
    select id, code, title, revision_count from tasks
    where ${base} and revision_count >= 2 and ${inRange(sql`coalesce(finished_at, updated_at)`)}
    order by revision_count desc, updated_at desc limit 5`)
  ).rows as { id: string; code: string; title: string; revision_count: number }[];

  const [qAll] = (
    await db.execute(sql`select avg(revision_count)::float as avg_rev, (count(*) filter (where revision_count = 0))::float / nullif(count(*),0) as first_pass from tasks where ${base} and status = 'finished' and ${inRange(sql`finished_at`)}`)
  ).rows as { avg_rev: number; first_pass: number }[];

  /* Attendance */
  const attendance = (
    await db.execute(sql`
    select u.id, u.name,
      count(distinct t.id)::int as assigned,
      count(distinct a.task_id) filter (where a.within_geofence)::int as valid,
      count(a.id)::int as checkins,
      count(a.id) filter (where a.is_late)::int as late
    from task_assignees ta
    join tasks t on t.id = ta.task_id
    join users u on u.id = ta.user_id
    left join attendances a on a.task_id = t.id and a.user_id = u.id
    where t.started_at is not null and ${inRange(sql`t.started_at`)} and t.id in (select id from tasks where ${base})
    group by u.id, u.name order by u.name`)
  ).rows as { id: string; name: string; assigned: number; valid: number; checkins: number; late: number }[];

  return {
    throughput: { finished: n(tp.finished), created: n(tp.created), open: n(tp.open), series, byProduct, byGroup },
    timing: {
      toJobDone: n(timing.to_job_done),
      toFinished: n(timing.to_finished),
      fieldWork: n(timing.field_work),
      paperwork: n(timing.paperwork),
      breached: n(timing.breached),
      total: n(timing.total),
      overdue: overdue.n,
    },
    quality: { avgRev: n(qAll.avg_rev), firstPass: n(qAll.first_pass), perTech: quality, topRevisions },
    attendance: attendance.map((a) => ({ ...a, compliance: a.assigned ? a.valid / a.assigned : 0, lateRate: a.checkins ? a.late / a.checkins : 0 })),
  };
}

export type Stats = Awaited<ReturnType<typeof getStats>>;

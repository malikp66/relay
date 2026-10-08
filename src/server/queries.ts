import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, lte, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, schema as s } from "@/db";
import type { TaskStatus } from "@/db/schema";
import type { CurrentUser } from "./auth";
import { andAll, canViewTask, taskScope } from "./policy";

export type TaskFilters = {
  q?: string;
  view?: "active" | "review" | "done" | "overdue" | "all";
  status?: TaskStatus[];
  groupId?: string;
  categoryId?: string;
  productId?: string;
  priorityId?: string;
  assigneeId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

const CLOSED: TaskStatus[] = ["finished", "cancelled"];
const FIELD_DONE: TaskStatus[] = ["job_done", "submitted", "under_review", "approved", "finished", "cancelled"];

function viewCondition(view: TaskFilters["view"]): SQL | undefined {
  switch (view) {
    case "active":
      return notInArray(s.tasks.status, CLOSED);
    case "review":
      return inArray(s.tasks.status, ["submitted", "under_review"]);
    case "done":
      return inArray(s.tasks.status, CLOSED);
    case "overdue":
      return and(notInArray(s.tasks.status, FIELD_DONE), lt(s.tasks.dueAt, new Date()));
    default:
      return undefined;
  }
}

export async function listTasks(user: CurrentUser, f: TaskFilters = {}) {
  const db = await getDb();
  const where = andAll(
    taskScope(user),
    viewCondition(f.view),
    f.status?.length ? inArray(s.tasks.status, f.status) : undefined,
    f.groupId ? eq(s.tasks.groupId, f.groupId) : undefined,
    f.categoryId ? eq(s.tasks.categoryId, f.categoryId) : undefined,
    f.productId ? eq(s.tasks.productId, f.productId) : undefined,
    f.priorityId ? eq(s.tasks.priorityId, f.priorityId) : undefined,
    f.assigneeId
      ? sql`exists (select 1 from ${s.taskAssignees} ta where ta.task_id = ${s.tasks.id} and ta.user_id = ${f.assigneeId})`
      : undefined,
    f.from ? gte(s.tasks.createdAt, f.from) : undefined,
    f.to ? lte(s.tasks.createdAt, f.to) : undefined,
    f.q
      ? or(ilike(s.tasks.code, `%${f.q}%`), ilike(s.tasks.title, `%${f.q}%`), ilike(s.customers.name, `%${f.q}%`), ilike(s.sites.name, `%${f.q}%`))
      : undefined,
  );

  const rows = await db
    .select({
      id: s.tasks.id,
      code: s.tasks.code,
      title: s.tasks.title,
      status: s.tasks.status,
      dueAt: s.tasks.dueAt,
      scheduledFor: s.tasks.scheduledFor,
      revisionCount: s.tasks.revisionCount,
      finishedAt: s.tasks.finishedAt,
      lastSubmittedAt: s.tasks.lastSubmittedAt,
      createdAt: s.tasks.createdAt,
      groupId: s.tasks.groupId,
      groupName: s.groups.name,
      categoryCode: s.categories.code,
      categoryName: s.categories.name,
      productName: s.products.name,
      priorityName: s.priorities.name,
      priorityLevel: s.priorities.level,
      siteName: s.sites.name,
      siteAddress: s.sites.address,
      customerName: s.customers.name,
    })
    .from(s.tasks)
    .innerJoin(s.groups, eq(s.groups.id, s.tasks.groupId))
    .innerJoin(s.categories, eq(s.categories.id, s.tasks.categoryId))
    .innerJoin(s.products, eq(s.products.id, s.tasks.productId))
    .innerJoin(s.priorities, eq(s.priorities.id, s.tasks.priorityId))
    .leftJoin(s.sites, eq(s.sites.id, s.tasks.siteId))
    .leftJoin(s.customers, eq(s.customers.id, s.tasks.customerId))
    .where(where)
    .orderBy(
      ...(f.view === "done"
        ? [desc(sql`coalesce(${s.tasks.finishedAt}, ${s.tasks.cancelledAt})`)]
        : [
            sql`case ${s.tasks.status} when 'revision' then 0 when 'in_progress' then 1 when 'assigned' then 2 when 'job_done' then 3 else 4 end`,
            desc(s.priorities.level),
            asc(s.tasks.dueAt),
          ]),
    )
    .limit(f.limit ?? 200);

  return attachTaskExtras(rows);
}

async function attachTaskExtras<T extends { id: string }>(rows: T[]) {
  if (!rows.length) return [] as (T & { assignees: { id: string; name: string }[]; progress: { done: number; total: number } })[];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  const assignees = await db
    .select({ taskId: s.taskAssignees.taskId, id: s.users.id, name: s.users.name })
    .from(s.taskAssignees)
    .innerJoin(s.users, eq(s.users.id, s.taskAssignees.userId))
    .where(inArray(s.taskAssignees.taskId, ids));
  const progress = await db
    .select({
      taskId: s.checklistItems.taskId,
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(${s.checklistResponses.completedAt})::int`,
    })
    .from(s.checklistItems)
    .leftJoin(s.checklistResponses, eq(s.checklistResponses.itemId, s.checklistItems.id))
    .where(inArray(s.checklistItems.taskId, ids))
    .groupBy(s.checklistItems.taskId);
  return rows.map((r) => ({
    ...r,
    assignees: assignees.filter((a) => a.taskId === r.id).map(({ id, name }) => ({ id, name })),
    progress: progress.find((p) => p.taskId === r.id) ?? { done: 0, total: 0 },
  }));
}

export type TaskListItem = Awaited<ReturnType<typeof listTasks>>[number];

export async function getTaskDetail(user: CurrentUser, id: string) {
  const db = await getDb();
  const creator = alias(s.users, "creator");
  const [t] = await db
    .select({
      task: s.tasks,
      groupName: s.groups.name,
      category: s.categories,
      productName: s.products.name,
      priority: s.priorities,
      site: s.sites,
      customer: s.customers,
      creatorName: creator.name,
    })
    .from(s.tasks)
    .innerJoin(s.groups, eq(s.groups.id, s.tasks.groupId))
    .innerJoin(s.categories, eq(s.categories.id, s.tasks.categoryId))
    .innerJoin(s.products, eq(s.products.id, s.tasks.productId))
    .innerJoin(s.priorities, eq(s.priorities.id, s.tasks.priorityId))
    .innerJoin(creator, eq(creator.id, s.tasks.createdBy))
    .leftJoin(s.sites, eq(s.sites.id, s.tasks.siteId))
    .leftJoin(s.customers, eq(s.customers.id, s.tasks.customerId))
    .where(eq(s.tasks.id, id));
  if (!t) return null;

  const assignees = await db
    .select({ id: s.users.id, name: s.users.name, phone: s.users.phone })
    .from(s.taskAssignees)
    .innerJoin(s.users, eq(s.users.id, s.taskAssignees.userId))
    .where(eq(s.taskAssignees.taskId, id));
  if (!canViewTask(user, t.task, assignees.map((a) => a.id))) return "forbidden" as const;

  const completer = alias(s.users, "completer");
  const items = await db
    .select({ item: s.checklistItems, response: s.checklistResponses, completedByName: completer.name })
    .from(s.checklistItems)
    .leftJoin(s.checklistResponses, eq(s.checklistResponses.itemId, s.checklistItems.id))
    .leftJoin(completer, eq(completer.id, s.checklistResponses.completedBy))
    .where(eq(s.checklistItems.taskId, id))
    .orderBy(asc(s.checklistItems.sort));

  const editor = alias(s.users, "editor");
  const [report] = await db
    .select({ report: s.reports, editorName: editor.name })
    .from(s.reports)
    .leftJoin(editor, eq(editor.id, s.reports.lastEditedBy))
    .where(eq(s.reports.taskId, id));
  const [template] = await db.select().from(s.reportTemplates).where(eq(s.reportTemplates.categoryId, t.category.id)).limit(1);

  const reviews = await db
    .select({ review: s.reviews, reviewerName: s.users.name })
    .from(s.reviews)
    .innerJoin(s.users, eq(s.users.id, s.reviews.reviewerId))
    .where(eq(s.reviews.taskId, id))
    .orderBy(asc(s.reviews.passNo));

  const events = await db
    .select({ event: s.taskEvents, actorName: s.users.name })
    .from(s.taskEvents)
    .leftJoin(s.users, eq(s.users.id, s.taskEvents.actorId))
    .where(eq(s.taskEvents.taskId, id))
    .orderBy(desc(s.taskEvents.createdAt));

  const attendance = await db
    .select({ a: s.attendances, userName: s.users.name })
    .from(s.attendances)
    .innerJoin(s.users, eq(s.users.id, s.attendances.userId))
    .where(eq(s.attendances.taskId, id))
    .orderBy(asc(s.attendances.checkInAt));

  const [myOpen] = await db
    .select({ id: s.attendances.id, taskId: s.attendances.taskId, code: s.tasks.code })
    .from(s.attendances)
    .innerJoin(s.tasks, eq(s.tasks.id, s.attendances.taskId))
    .where(and(eq(s.attendances.userId, user.id), isNull(s.attendances.checkOutAt)));

  return {
    ...t,
    assignees,
    items: items.map((r) => ({ ...r.item, response: r.response, completedByName: r.completedByName })),
    report: report?.report ?? null,
    reportEditorName: report?.editorName ?? null,
    // field laporan = salinan versi saat laporan dibuat (bila ada), selain itu template terbaru
    template: template ? { ...template, fields: report?.report.templateFields ?? template.fields, version: report?.report.templateVersion ?? template.version } : template,
    reviews,
    events,
    attendance,
    myOpenAttendance: myOpen ?? null,
  };
}

export type TaskDetail = Exclude<NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>, "forbidden">;

/* ───────────── Dashboard ───────────── */

export async function countByStatus(user: CurrentUser, extra?: SQL) {
  const db = await getDb();
  const rows = await db
    .select({ status: s.tasks.status, n: sql<number>`count(*)::int` })
    .from(s.tasks)
    .where(andAll(taskScope(user), extra))
    .groupBy(s.tasks.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<TaskStatus, number>>;
}

export async function overdueCount(user: CurrentUser) {
  const db = await getDb();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.tasks)
    .where(andAll(taskScope(user), viewCondition("overdue")));
  return r.n;
}

/** Beban per teknisi di group yang dilihat user (task aktif per status). */
export async function teamLoad(groupIds?: string[]) {
  const db = await getDb();
  const members = await db
    .select({ id: s.users.id, name: s.users.name, groupId: s.groupMembers.groupId, groupName: s.groups.name })
    .from(s.groupMembers)
    .innerJoin(s.users, eq(s.users.id, s.groupMembers.userId))
    .innerJoin(s.groups, eq(s.groups.id, s.groupMembers.groupId))
    .where(andAll(eq(s.groupMembers.memberRole, "technician"), groupIds ? inArray(s.groupMembers.groupId, groupIds) : undefined))
    .orderBy(asc(s.groups.name), asc(s.users.name));
  const load = await db
    .select({ userId: s.taskAssignees.userId, status: s.tasks.status, n: sql<number>`count(*)::int` })
    .from(s.taskAssignees)
    .innerJoin(s.tasks, eq(s.tasks.id, s.taskAssignees.taskId))
    .where(notInArray(s.tasks.status, CLOSED))
    .groupBy(s.taskAssignees.userId, s.tasks.status);
  const today = startOfDay();
  const checkins = await db
    .select({ userId: s.attendances.userId, open: sql<boolean>`bool_or(${s.attendances.checkOutAt} is null)`, n: sql<number>`count(*)::int` })
    .from(s.attendances)
    .where(gte(s.attendances.checkInAt, today))
    .groupBy(s.attendances.userId);
  return members.map((m) => {
    const mine = load.filter((l) => l.userId === m.id);
    const ci = checkins.find((c) => c.userId === m.id);
    return {
      ...m,
      byStatus: Object.fromEntries(mine.map((l) => [l.status, l.n])) as Partial<Record<TaskStatus, number>>,
      active: mine.reduce((a, b) => a + b.n, 0),
      onSite: !!ci?.open,
      checkinsToday: ci?.n ?? 0,
    };
  });
}

export function startOfDay(d = new Date()) {
  // WIB (UTC+7)
  const wib = new Date(d.getTime() + 7 * 3600_000);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - 7 * 3600_000);
}

/* ───────────── Attendance ───────────── */

export async function attendanceList(user: CurrentUser, opts: { from: Date; to: Date; userId?: string }) {
  const db = await getDb();
  let userFilter: SQL | undefined;
  if (user.role === "technician") userFilter = eq(s.attendances.userId, user.id);
  else if (user.role === "supervisor") userFilter = inArray(s.tasks.groupId, user.supervisedGroupIds.length ? user.supervisedGroupIds : ["-"]);
  return db
    .select({
      a: s.attendances,
      userName: s.users.name,
      taskId: s.tasks.id,
      taskCode: s.tasks.code,
      taskTitle: s.tasks.title,
      scheduledFor: s.tasks.scheduledFor,
      siteName: s.sites.name,
      groupName: s.groups.name,
    })
    .from(s.attendances)
    .innerJoin(s.users, eq(s.users.id, s.attendances.userId))
    .innerJoin(s.tasks, eq(s.tasks.id, s.attendances.taskId))
    .innerJoin(s.groups, eq(s.groups.id, s.tasks.groupId))
    .leftJoin(s.sites, eq(s.sites.id, s.tasks.siteId))
    .where(andAll(userFilter, gte(s.attendances.checkInAt, opts.from), lte(s.attendances.checkInAt, opts.to), opts.userId ? eq(s.attendances.userId, opts.userId) : undefined))
    .orderBy(desc(s.attendances.checkInAt));
}

export async function myOpenAttendance(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ a: s.attendances, taskCode: s.tasks.code, taskTitle: s.tasks.title, taskId: s.tasks.id })
    .from(s.attendances)
    .innerJoin(s.tasks, eq(s.tasks.id, s.attendances.taskId))
    .where(and(eq(s.attendances.userId, userId), isNull(s.attendances.checkOutAt)));
  return row ?? null;
}

/* ───────────── Master data ───────────── */

export async function masterData() {
  const db = await getDb();
  const [categories, products, priorities, groups, sites, customers] = await Promise.all([
    db.select().from(s.categories).orderBy(asc(s.categories.name)),
    db.select().from(s.products).orderBy(asc(s.products.name)),
    db.select().from(s.priorities).orderBy(asc(s.priorities.level)),
    db.select().from(s.groups).orderBy(asc(s.groups.name)),
    db.select().from(s.sites).orderBy(asc(s.sites.name)),
    db.select().from(s.customers).orderBy(asc(s.customers.name)),
  ]);
  const scopes = await db.select().from(s.groupScopes);
  return { categories, products, priorities, groups, sites, customers, scopes };
}

export async function technicians(groupIds?: string[]) {
  const db = await getDb();
  return db
    .select({ id: s.users.id, name: s.users.name, groupId: s.groupMembers.groupId })
    .from(s.groupMembers)
    .innerJoin(s.users, eq(s.users.id, s.groupMembers.userId))
    .where(andAll(eq(s.groupMembers.memberRole, "technician"), eq(s.users.isActive, true), groupIds ? inArray(s.groupMembers.groupId, groupIds) : undefined))
    .orderBy(asc(s.users.name));
}

export async function checklistTemplatesWithItems() {
  const db = await getDb();
  const tpls = await db
    .select({ tpl: s.checklistTemplates, categoryName: s.categories.name, categoryCode: s.categories.code, productName: s.products.name, productIcon: s.products.icon })
    .from(s.checklistTemplates)
    .innerJoin(s.categories, eq(s.categories.id, s.checklistTemplates.categoryId))
    .innerJoin(s.products, eq(s.products.id, s.checklistTemplates.productId))
    .orderBy(asc(s.categories.code), asc(s.products.name));
  const items = await db.select().from(s.checklistTemplateItems).orderBy(asc(s.checklistTemplateItems.sort));
  return tpls.map((t) => ({ ...t.tpl, categoryName: t.categoryName, categoryCode: t.categoryCode, productName: t.productName, productIcon: t.productIcon, items: items.filter((i) => i.templateId === t.tpl.id) }));
}

/* ───────────── Schedule ───────────── */

export async function scheduledTasks(user: CurrentUser, from: Date, to: Date) {
  const db = await getDb();
  const rows = await db
    .select({
      id: s.tasks.id,
      code: s.tasks.code,
      title: s.tasks.title,
      status: s.tasks.status,
      scheduledFor: s.tasks.scheduledFor,
      categoryCode: s.categories.code,
      productId: s.tasks.productId,
      productName: s.products.name,
      priorityLevel: s.priorities.level,
      priorityName: s.priorities.name,
      siteName: s.sites.name,
      groupId: s.tasks.groupId,
    })
    .from(s.tasks)
    .innerJoin(s.categories, eq(s.categories.id, s.tasks.categoryId))
    .innerJoin(s.products, eq(s.products.id, s.tasks.productId))
    .innerJoin(s.priorities, eq(s.priorities.id, s.tasks.priorityId))
    .leftJoin(s.sites, eq(s.sites.id, s.tasks.siteId))
    .where(andAll(taskScope(user), gte(s.tasks.scheduledFor, from), lte(s.tasks.scheduledFor, to), ne(s.tasks.status, "cancelled")))
    .orderBy(asc(s.tasks.scheduledFor));
  return attachTaskExtras(rows);
}

export async function maintenancePlans(user: CurrentUser) {
  const db = await getDb();
  const groupFilter =
    user.role === "admin" ? undefined : inArray(s.maintenancePlans.groupId, (user.role === "supervisor" ? user.supervisedGroupIds : user.memberGroupIds).concat("-"));
  const plans = await db
    .select({ plan: s.maintenancePlans, siteName: s.sites.name, productName: s.products.name, priorityName: s.priorities.name, groupName: s.groups.name })
    .from(s.maintenancePlans)
    .innerJoin(s.sites, eq(s.sites.id, s.maintenancePlans.siteId))
    .innerJoin(s.products, eq(s.products.id, s.maintenancePlans.productId))
    .innerJoin(s.priorities, eq(s.priorities.id, s.maintenancePlans.priorityId))
    .innerJoin(s.groups, eq(s.groups.id, s.maintenancePlans.groupId))
    .where(groupFilter)
    .orderBy(asc(s.maintenancePlans.nextDate));
  const users = await db.select({ id: s.users.id, name: s.users.name }).from(s.users);
  return plans.map((p) => ({ ...p, assignees: users.filter((u) => p.plan.assigneeIds.includes(u.id)) }));
}

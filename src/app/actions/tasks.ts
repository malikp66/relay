"use server";

import { and, eq, inArray, isNull, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { requireUser } from "@/server/auth";
import { canManageTask, isAssignee } from "@/server/policy";
import { notifyTask } from "@/server/notifications";
import { CHECKLIST_EDITABLE, REPORT_EDITABLE, WorkflowError, loadTaskForAction, transition, type TransitionAction } from "@/server/workflow";

export type Result = { ok: true; id?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const fail = (e: unknown): Result => ({ ok: false, error: e instanceof WorkflowError || e instanceof z.ZodError ? (e instanceof z.ZodError ? e.issues[0]?.message ?? "Data tidak valid." : e.message) : "Terjadi kesalahan. Coba lagi." });

function refresh() {
  revalidatePath("/", "layout");
}

/* ───────────── Buat task ───────────── */

const createSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter."),
  description: z.string().trim().optional(),
  categoryId: z.string().min(1, "Pilih kategori."),
  productId: z.string().min(1, "Pilih produk."),
  priorityId: z.string().min(1, "Pilih prioritas."),
  siteId: z.string().min(1, "Pilih lokasi."),
  customerId: z.string().optional(),
  scheduledFor: z.string().min(1, "Isi jadwal."),
  dueAt: z.string().min(1, "Isi deadline."),
  assigneeIds: z.array(z.string()).min(1, "Pilih minimal 1 teknisi."),
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Label item checklist wajib diisi."),
        type: z.enum(["tick", "data", "photo"]),
        unit: z.string().optional(),
        required: z.boolean(),
      }),
    )
    .min(1, "Checklist minimal 1 item."),
});

export async function createTaskAction(input: z.input<typeof createSchema>): Promise<Result> {
  try {
    const user = await requireUser(["admin", "supervisor"]);
    const data = createSchema.parse(input);
    const db = await getDb();
    const [scope] = await db.select().from(s.groupScopes).where(eq(s.groupScopes.categoryId, data.categoryId)).limit(1);
    if (!scope) throw new WorkflowError("Belum ada group yang menangani kategori ini.");
    const groupId = scope.groupId;
    if (!canManageTask(user, { id: "", groupId })) throw new WorkflowError("Kategori ini ditangani group lain. Supervisor hanya bisa membuat task untuk group-nya.");

    const techs = await db
      .select({ userId: s.groupMembers.userId })
      .from(s.groupMembers)
      .where(and(eq(s.groupMembers.groupId, groupId), eq(s.groupMembers.memberRole, "technician"), inArray(s.groupMembers.userId, data.assigneeIds)));
    if (techs.length !== data.assigneeIds.length) throw new WorkflowError("Teknisi harus anggota group yang menangani task ini.");

    const [cat] = await db.select().from(s.categories).where(eq(s.categories.id, data.categoryId));
    const now = new Date();
    const prefix = `${cat.code}-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.tasks).where(like(s.tasks.code, `${prefix}-%`));
    const code = `${prefix}-${String(n + 1).padStart(4, "0")}`;

    const [task] = await db
      .insert(s.tasks)
      .values({
        code,
        title: data.title,
        description: data.description || null,
        categoryId: data.categoryId,
        productId: data.productId,
        groupId,
        priorityId: data.priorityId,
        siteId: data.siteId,
        customerId: data.customerId || null,
        status: "assigned",
        source: cat.code === "TS" ? "complaint" : "manual",
        createdBy: user.id,
        scheduledFor: new Date(data.scheduledFor),
        dueAt: new Date(data.dueAt),
      })
      .returning();
    await db.insert(s.taskAssignees).values(data.assigneeIds.map((userId) => ({ taskId: task.id, userId })));
    await db.insert(s.checklistItems).values(data.items.map((it, i) => ({ taskId: task.id, label: it.label, type: it.type, unit: it.unit || null, required: it.required, sort: i })));
    const names = await db.select({ name: s.users.name }).from(s.users).where(inArray(s.users.id, data.assigneeIds));
    await db.insert(s.taskEvents).values({ taskId: task.id, actorId: user.id, type: "created", toStatus: "assigned", note: `Ditugaskan ke ${names.map((x) => x.name).join(", ")}` });
    await notifyTask("task_assigned", task.id, { id: user.id, name: user.name });
    refresh();
    return { ok: true, id: task.id };
  } catch (e) {
    return fail(e);
  }
}

/* ───────────── Transisi status ───────────── */

export async function transitionAction(taskId: string, action: TransitionAction, comments?: string): Promise<Result> {
  try {
    const user = await requireUser();
    await transition(user, taskId, action, { comments });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ───────────── Attendance ───────────── */

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function checkInAction(taskId: string, pos: { lat: number; lng: number; accuracy?: number }): Promise<Result & { distance?: number; within?: boolean }> {
  try {
    const user = await requireUser(["technician"]);
    const db = await getDb();
    const { task, assigneeIds } = await loadTaskForAction(db, taskId);
    if (!isAssignee(user, assigneeIds)) throw new WorkflowError("Kamu tidak ditugaskan di task ini.");
    if (!["assigned", "in_progress", "revision"].includes(task.status)) throw new WorkflowError("Check-in tidak tersedia untuk status ini.");
    const [open] = await db
      .select({ taskId: s.attendances.taskId })
      .from(s.attendances)
      .where(and(eq(s.attendances.userId, user.id), isNull(s.attendances.checkOutAt)));
    if (open) throw new WorkflowError(open.taskId === taskId ? "Kamu sudah check-in di task ini." : "Kamu masih check-in di task lain. Check-out dulu.");

    const [site] = task.siteId ? await db.select().from(s.sites).where(eq(s.sites.id, task.siteId)) : [];
    const distance = site ? Math.round(haversine(pos.lat, pos.lng, site.lat, site.lng)) : null;
    const within = site && distance !== null ? distance <= site.radiusM : null;
    const now = new Date();
    const isLate = !!task.scheduledFor && now.getTime() > task.scheduledFor.getTime() + 15 * 60_000;

    await db.insert(s.attendances).values({
      userId: user.id,
      taskId,
      checkInAt: now,
      checkInLat: pos.lat,
      checkInLng: pos.lng,
      accuracyM: pos.accuracy ?? null,
      distanceM: distance,
      withinGeofence: within,
      isLate,
    });
    const note = `Check-in ${within === false ? `di luar radius (${distance} m dari lokasi)` : distance !== null ? `${distance} m dari lokasi` : ""}${isLate ? " · terlambat" : ""}`;
    if (task.status === "assigned") {
      await db.update(s.tasks).set({ status: "in_progress", startedAt: now, version: task.version + 1 }).where(eq(s.tasks.id, taskId));
      await db.insert(s.taskEvents).values({ taskId, actorId: user.id, type: "check_in", fromStatus: "assigned", toStatus: "in_progress", note });
      await notifyTask("task_started", taskId, { id: user.id, name: user.name }, note.trim());
    } else {
      await db.insert(s.taskEvents).values({ taskId, actorId: user.id, type: "check_in", note });
    }
    refresh();
    return { ok: true, distance: distance ?? undefined, within: within ?? undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function checkOutAction(taskId: string): Promise<Result> {
  try {
    const user = await requireUser(["technician"]);
    const db = await getDb();
    const updated = await db
      .update(s.attendances)
      .set({ checkOutAt: new Date() })
      .where(and(eq(s.attendances.userId, user.id), eq(s.attendances.taskId, taskId), isNull(s.attendances.checkOutAt)))
      .returning();
    if (!updated.length) throw new WorkflowError("Tidak ada check-in aktif.");
    await db.insert(s.taskEvents).values({ taskId, actorId: user.id, type: "check_out", note: "Check-out dari lokasi" });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ───────────── Checklist ───────────── */

export async function saveChecklistResponseAction(itemId: string, patch: { checked?: boolean; value?: string; photos?: string[] }): Promise<Result> {
  try {
    const user = await requireUser(["technician"]);
    const db = await getDb();
    const [item] = await db.select().from(s.checklistItems).where(eq(s.checklistItems.id, itemId));
    if (!item) throw new WorkflowError("Item tidak ditemukan.");
    const { task, assigneeIds } = await loadTaskForAction(db, item.taskId);
    if (!isAssignee(user, assigneeIds)) throw new WorkflowError("Kamu tidak ditugaskan di task ini.");
    if (!CHECKLIST_EDITABLE.includes(task.status)) throw new WorkflowError("Checklist terkunci pada status ini.");
    const [att] = await db.select({ id: s.attendances.id }).from(s.attendances).where(and(eq(s.attendances.taskId, task.id), eq(s.attendances.userId, user.id))).limit(1);
    if (!att && task.status === "in_progress") throw new WorkflowError("Check-in di lokasi dulu sebelum mengisi checklist.");

    const [existing] = await db.select().from(s.checklistResponses).where(eq(s.checklistResponses.itemId, itemId));
    const next = {
      checked: patch.checked ?? existing?.checked ?? null,
      value: patch.value ?? existing?.value ?? null,
      photos: patch.photos ?? existing?.photos ?? [],
    };
    const complete = item.type === "tick" ? !!next.checked : item.type === "data" ? !!next.value?.trim() : next.photos.length > 0;
    const values = { ...next, completedBy: complete ? user.id : null, completedAt: complete ? new Date() : null };
    if (existing) await db.update(s.checklistResponses).set(values).where(eq(s.checklistResponses.id, existing.id));
    else await db.insert(s.checklistResponses).values({ itemId, ...values });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ───────────── Laporan ───────────── */

export async function saveReportAction(taskId: string, fields: Record<string, string | number | boolean | null>, findings: string): Promise<Result> {
  try {
    const user = await requireUser(["technician"]);
    const db = await getDb();
    const { task, assigneeIds } = await loadTaskForAction(db, taskId);
    if (!isAssignee(user, assigneeIds)) throw new WorkflowError("Kamu tidak ditugaskan di task ini.");
    if (!REPORT_EDITABLE.includes(task.status)) throw new WorkflowError("Laporan terkunci pada status ini.");
    const [existing] = await db.select().from(s.reports).where(eq(s.reports.taskId, taskId));
    if (existing) {
      await db
        .update(s.reports)
        .set({ fields, findings, lastEditedBy: user.id, version: existing.version + 1 })
        .where(eq(s.reports.id, existing.id));
    } else {
      const [tpl] = await db.select().from(s.reportTemplates).where(eq(s.reportTemplates.categoryId, task.categoryId)).limit(1);
      await db.insert(s.reports).values({ taskId, templateId: tpl?.id, templateFields: tpl?.fields, templateVersion: tpl?.version, fields, findings, lastEditedBy: user.id });
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ───────────── Maintenance plan → task ───────────── */

export async function generateFromPlanAction(planId: string): Promise<Result> {
  try {
    const user = await requireUser(["admin", "supervisor"]);
    const db = await getDb();
    const [plan] = await db.select().from(s.maintenancePlans).where(eq(s.maintenancePlans.id, planId));
    if (!plan) throw new WorkflowError("Rencana tidak ditemukan.");
    if (!canManageTask(user, { id: "", groupId: plan.groupId })) throw new WorkflowError("Bukan group kamu.");
    const [cat] = await db.select().from(s.categories).where(eq(s.categories.code, "MT"));
    const [tpl] = await db
      .select()
      .from(s.checklistTemplates)
      .where(and(eq(s.checklistTemplates.categoryId, cat.id), eq(s.checklistTemplates.productId, plan.productId)));
    const items = tpl ? await db.select().from(s.checklistTemplateItems).where(eq(s.checklistTemplateItems.templateId, tpl.id)) : [];
    const [prio] = await db.select().from(s.priorities).where(eq(s.priorities.id, plan.priorityId));
    const scheduled = plan.nextDate;
    const res = await createTaskAction({
      title: plan.title,
      description: `Dibuat dari rencana maintenance (${plan.frequency === "weekly" ? "mingguan" : "bulanan"}).`,
      categoryId: cat.id,
      productId: plan.productId,
      priorityId: plan.priorityId,
      siteId: plan.siteId,
      scheduledFor: scheduled.toISOString(),
      dueAt: new Date(scheduled.getTime() + prio.slaHours * 3600_000).toISOString(),
      assigneeIds: plan.assigneeIds,
      items: items.sort((a, b) => a.sort - b.sort).map((i) => ({ label: i.label, type: i.type, unit: i.unit ?? undefined, required: i.required })),
    });
    if (!res.ok) return res;
    const next = new Date(scheduled);
    if (plan.frequency === "weekly") next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    await db.update(s.maintenancePlans).set({ nextDate: next }).where(eq(s.maintenancePlans.id, planId));
    await db.update(s.tasks).set({ source: "maintenance_plan" }).where(eq(s.tasks.id, res.id!));
    refresh();
    return res;
  } catch (e) {
    return fail(e);
  }
}

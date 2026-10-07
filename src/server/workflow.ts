import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema as s, type DB } from "@/db";
import type { ReportField, TaskStatus } from "@/db/schema";
import type { CurrentUser } from "./auth";
import { canManageTask, isAssignee } from "./policy";

/**
 * State machine task (RENCANA §6). Semua perubahan status lewat sini.
 */
export type TransitionAction = "job_done" | "submit" | "resubmit" | "start_review" | "approve" | "request_revision" | "cancel";

export class WorkflowError extends Error {}

const ACTIONS: Record<TransitionAction, { from: TaskStatus[]; to: TaskStatus; actor: "assignee" | "manager" }> = {
  job_done: { from: ["in_progress"], to: "job_done", actor: "assignee" },
  submit: { from: ["job_done"], to: "submitted", actor: "assignee" },
  resubmit: { from: ["revision"], to: "under_review", actor: "assignee" },
  start_review: { from: ["submitted"], to: "under_review", actor: "manager" },
  approve: { from: ["under_review"], to: "approved", actor: "manager" },
  request_revision: { from: ["under_review"], to: "revision", actor: "manager" },
  cancel: { from: ["assigned", "in_progress"], to: "cancelled", actor: "manager" },
};

export async function loadTaskForAction(db: DB, taskId: string) {
  const [task] = await db.select().from(s.tasks).where(eq(s.tasks.id, taskId));
  if (!task) throw new WorkflowError("Task tidak ditemukan.");
  const assignees = await db.select({ userId: s.taskAssignees.userId }).from(s.taskAssignees).where(eq(s.taskAssignees.taskId, taskId));
  return { task, assigneeIds: assignees.map((a) => a.userId) };
}

/** Item wajib yang belum terpenuhi (ticked / terisi / ada foto). */
export async function missingRequiredItems(db: DB, taskId: string) {
  const rows = await db
    .select({ item: s.checklistItems, r: s.checklistResponses })
    .from(s.checklistItems)
    .leftJoin(s.checklistResponses, eq(s.checklistResponses.itemId, s.checklistItems.id))
    .where(and(eq(s.checklistItems.taskId, taskId), eq(s.checklistItems.required, true)));
  return rows
    .filter(({ item, r }) => {
      if (!r) return true;
      if (item.type === "tick") return !r.checked;
      if (item.type === "data") return !r.value?.trim();
      return !(r.photos?.length > 0);
    })
    .map(({ item }) => item.label);
}

export async function missingReportFields(db: DB, taskId: string, categoryId: string) {
  const [tpl] = await db.select().from(s.reportTemplates).where(eq(s.reportTemplates.categoryId, categoryId)).limit(1);
  const [report] = await db.select().from(s.reports).where(eq(s.reports.taskId, taskId));
  const fields: ReportField[] = tpl?.fields ?? [];
  const values = report?.fields ?? {};
  const missing = fields.filter((f) => f.required && (values[f.key] === undefined || values[f.key] === null || String(values[f.key]).trim() === "")).map((f) => f.label);
  if (!report?.findings?.trim()) missing.push("Temuan / catatan akhir");
  return missing;
}

export async function transition(user: CurrentUser, taskId: string, action: TransitionAction, payload: { comments?: string } = {}) {
  const db = await getDb();
  const spec = ACTIONS[action];
  const { task, assigneeIds } = await loadTaskForAction(db, taskId);

  if (!spec.from.includes(task.status)) {
    throw new WorkflowError(`Aksi tidak bisa dilakukan saat status ${task.status}.`);
  }
  if (spec.actor === "assignee" && !isAssignee(user, assigneeIds)) {
    throw new WorkflowError("Hanya teknisi yang ditugaskan yang bisa melakukan aksi ini.");
  }
  if (spec.actor === "manager" && !canManageTask(user, task)) {
    throw new WorkflowError("Hanya supervisor group ini yang bisa melakukan aksi ini.");
  }

  const now = new Date();
  const patch: Partial<typeof s.tasks.$inferInsert> = { status: spec.to, version: task.version + 1 };
  let note: string | null = null;

  if (action === "job_done" || action === "submit" || action === "resubmit") {
    const missing = await missingRequiredItems(db, taskId);
    if (missing.length) throw new WorkflowError(`Item wajib belum lengkap: ${missing.join(", ")}`);
  }
  if (action === "submit" || action === "resubmit") {
    const missing = await missingReportFields(db, taskId, task.categoryId);
    if (missing.length) throw new WorkflowError(`Laporan belum lengkap: ${missing.join(", ")}`);
  }
  if ((action === "request_revision" || action === "cancel") && !payload.comments?.trim()) {
    throw new WorkflowError(action === "cancel" ? "Alasan pembatalan wajib diisi." : "Komentar revisi wajib diisi.");
  }

  switch (action) {
    case "job_done": {
      patch.jobDoneAt = now;
      const [existing] = await db.select({ id: s.reports.id }).from(s.reports).where(eq(s.reports.taskId, taskId));
      if (!existing) {
        const [tpl] = await db.select().from(s.reportTemplates).where(eq(s.reportTemplates.categoryId, task.categoryId)).limit(1);
        await db.insert(s.reports).values({ taskId, templateId: tpl?.id, fields: {}, lastEditedBy: user.id });
      }
      // check-out otomatis untuk semua attendance terbuka di task ini
      await db.update(s.attendances).set({ checkOutAt: now }).where(and(eq(s.attendances.taskId, taskId), isNull(s.attendances.checkOutAt)));
      break;
    }
    case "submit":
    case "resubmit":
      patch.lastSubmittedAt = now;
      if (!task.submittedAt) patch.submittedAt = now;
      await db.update(s.reports).set({ submittedAt: now, submittedBy: user.id }).where(eq(s.reports.taskId, taskId));
      note = action === "resubmit" ? "Laporan revisi dikirim ulang" : "Laporan dikirim";
      break;
    case "start_review":
      note = "Supervisor mulai mereview";
      break;
    case "request_revision": {
      patch.revisionCount = task.revisionCount + 1;
      await insertReview(db, taskId, user.id, "revision", payload.comments!);
      note = payload.comments!;
      break;
    }
    case "approve": {
      patch.approvedAt = now;
      await insertReview(db, taskId, user.id, "approve", payload.comments ?? null);
      note = payload.comments || "Laporan disetujui";
      break;
    }
    case "cancel":
      patch.cancelledAt = now;
      patch.cancelReason = payload.comments!;
      note = payload.comments!;
      await db.update(s.attendances).set({ checkOutAt: now, autoClosed: true }).where(and(eq(s.attendances.taskId, taskId), isNull(s.attendances.checkOutAt)));
      break;
  }

  const updated = await db
    .update(s.tasks)
    .set(patch)
    .where(and(eq(s.tasks.id, taskId), eq(s.tasks.version, task.version)))
    .returning({ id: s.tasks.id });
  if (!updated.length) throw new WorkflowError("Task baru saja diubah orang lain. Muat ulang halaman.");

  await db.insert(s.taskEvents).values({ taskId, actorId: user.id, type: "status", fromStatus: task.status, toStatus: spec.to, note });

  // Approved → Finished otomatis oleh sistem (RENCANA Q3)
  if (action === "approve") {
    await db.update(s.tasks).set({ status: "finished", finishedAt: new Date(), version: sql`${s.tasks.version} + 1` }).where(eq(s.tasks.id, taskId));
    await db.update(s.attendances).set({ checkOutAt: now, autoClosed: true }).where(and(eq(s.attendances.taskId, taskId), isNull(s.attendances.checkOutAt)));
    await db.insert(s.taskEvents).values({ taskId, actorId: null, type: "status", fromStatus: "approved", toStatus: "finished", note: "Ditutup otomatis oleh sistem" });
  }
}

async function insertReview(db: DB, taskId: string, reviewerId: string, decision: "approve" | "revision", comments: string | null) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.reviews).where(eq(s.reviews.taskId, taskId));
  await db.insert(s.reviews).values({ taskId, passNo: n + 1, reviewerId, decision, comments });
}

/** Status di mana teknisi boleh mengisi checklist. */
export const CHECKLIST_EDITABLE: TaskStatus[] = ["in_progress", "job_done", "revision"];
export const REPORT_EDITABLE: TaskStatus[] = ["job_done", "revision"];

import "server-only";
import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { after } from "next/server";
import webpush from "web-push";
import { getDb, schema as s, type DB } from "@/db";
import type { NotificationKind } from "@/db/schema";
import { fmtDateTime } from "@/lib/format";

/**
 * Notifikasi Relay: disimpan di tabel `notifications` (lonceng di app) + Web Push ke perangkat (service worker).
 * Push butuh env VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (lihat README); tanpa itu, notifikasi in-app tetap jalan.
 */

type Actor = { id: string; name: string } | null;
type Ctx = {
  task: { id: string; code: string; title: string; groupId: string; dueAt: Date | null; scheduledFor: Date | null };
  place: string;
  assigneeIds: string[];
  supervisorIds: string[];
  adminIds: string[];
};
type Draft = { kind: NotificationKind; title: string; body: string; url: string; to: string[] };

const first = (name: string) => name.split(" ")[0];
const quote = (t: string, max = 140) => `“${t.length > max ? `${t.slice(0, max - 1)}…` : t}”`;

/** Isi notifikasi per jenis kejadian — penerima, judul, isi lengkap. */
function compose(kind: NotificationKind, c: Ctx | null, actor: Actor, note?: string | null): Draft {
  if (kind === "test" || !c) return { kind: "test", to: [], url: "/account", title: "Notifikasi uji", body: "Notifikasi Relay sudah aktif di perangkat ini. Kabar task baru, revisi, dan persetujuan akan muncul seperti ini." };
  const { task, place } = c;
  const url = `/tasks/${task.id}`;
  const who = actor ? first(actor.name) : "Sistem";
  const head = `${task.code} · ${task.title}`;
  const at = task.title.includes(place) ? "" : ` di ${place}`; // judul TS sudah memuat nama pelanggan
  switch (kind) {
    case "task_assigned":
      return {
        kind,
        to: c.assigneeIds,
        url,
        title: `Task baru: ${task.code}`,
        body: `${task.title}${at}. Jadwal ${fmtDateTime(task.scheduledFor)}, deadline ${fmtDateTime(task.dueAt)}. Ditugaskan oleh ${who}.`,
      };
    case "task_started":
      return { kind, to: c.supervisorIds, url, title: `${who} mulai mengerjakan ${task.code}`, body: `${task.title}${at}. ${note ?? "Check-in di lokasi"}.` };
    case "job_done":
      return { kind, to: c.supervisorIds, url, title: `${task.code} selesai dikerjakan`, body: `${who} menandai Job Done untuk ${task.title}. Laporan sedang disiapkan.` };
    case "report_submitted":
      return { kind, to: c.supervisorIds, url: `${url}?tab=report`, title: "Laporan menunggu review", body: `${head}, dikirim ${who}. Buka untuk mulai review.` };
    case "report_resubmitted":
      return { kind, to: c.supervisorIds, url: `${url}?tab=report`, title: `Revisi ${task.code} dikirim ulang`, body: `${who} sudah memperbaiki laporan ${task.title}. Siap direview lagi.` };
    case "review_started":
      return { kind, to: c.assigneeIds, url, title: "Laporan sedang direview", body: `${who} mulai mereview ${head}.` };
    case "revision_requested":
      return { kind, to: c.assigneeIds, url: `${url}?tab=report`, title: `Perlu revisi: ${task.code}`, body: `${note ? quote(note) : "Ada yang perlu diperbaiki"} dari ${who}. Perbaiki lalu kirim ulang.` };
    case "task_approved":
      return { kind, to: c.assigneeIds, url, title: `Laporan ${task.code} disetujui`, body: `${note && note !== "Laporan disetujui" ? `${quote(note)} dari ${who}. ` : `Disetujui ${who}. `}Task ${task.title} ditutup.` };
    case "task_cancelled":
      return { kind, to: c.assigneeIds, url, title: `Task ${task.code} dibatalkan`, body: `${task.title}. Alasan: ${note ?? "tidak disebutkan"} (oleh ${who}). Tidak perlu ke lokasi.` };
    case "due_soon":
      return { kind, to: c.assigneeIds, url, title: `Deadline ${task.code} kurang dari 2 jam`, body: `${task.title}${at}. Deadline ${fmtDateTime(task.dueAt)}.` };
    case "overdue":
      return { kind, to: [...c.assigneeIds, ...c.supervisorIds, ...c.adminIds], url, title: `${task.code} lewat deadline`, body: `${task.title}${at} belum Job Done. Deadline ${fmtDateTime(task.dueAt)}.` };
  }
}

async function loadCtx(db: DB, taskId: string): Promise<Ctx | null> {
  const [row] = await db
    .select({ task: s.tasks, siteName: s.sites.name, customerName: s.customers.name })
    .from(s.tasks)
    .leftJoin(s.sites, eq(s.sites.id, s.tasks.siteId))
    .leftJoin(s.customers, eq(s.customers.id, s.tasks.customerId))
    .where(eq(s.tasks.id, taskId));
  if (!row) return null;
  const [assignees, sups, admins] = await Promise.all([
    db.select({ id: s.taskAssignees.userId }).from(s.taskAssignees).where(eq(s.taskAssignees.taskId, taskId)),
    db
      .select({ id: s.groupMembers.userId })
      .from(s.groupMembers)
      .where(and(eq(s.groupMembers.groupId, row.task.groupId), eq(s.groupMembers.memberRole, "supervisor"))),
    db.select({ id: s.users.id }).from(s.users).where(and(eq(s.users.role, "admin"), eq(s.users.isActive, true))),
  ]);
  const adminIds = admins.map((x) => x.id);
  const supervisorIds = sups.length ? sups.map((x) => x.id) : adminIds; // crew tanpa supervisor → admin
  return { task: row.task, place: row.customerName ?? row.siteName ?? "lokasi", assigneeIds: assignees.map((a) => a.id), supervisorIds, adminIds };
}

/** Kirim notifikasi kejadian task ke penerima yang relevan (tanpa pelaku sendiri). Tidak pernah melempar error. */
export async function notifyTask(kind: NotificationKind, taskId: string, actor: Actor, note?: string | null) {
  try {
    const db = await getDb();
    const ctx = await loadCtx(db, taskId);
    if (!ctx) return;
    const d = compose(kind, ctx, actor, note);
    const to = [...new Set(d.to)].filter((u) => u !== actor?.id);
    await deliver(db, to, { ...d, taskId, actorId: actor?.id ?? null });
  } catch (e) {
    console.error("[notify]", e);
  }
}

type Row = typeof s.notifications.$inferInsert;
async function deliver(db: DB, to: string[], d: Omit<Draft, "to"> & { taskId: string | null; actorId: string | null }) {
  if (!to.length) return;
  const rows = await db
    .insert(s.notifications)
    .values(to.map((userId): Row => ({ userId, kind: d.kind, title: d.title, body: d.body, url: d.url, taskId: d.taskId, actorId: d.actorId })))
    .returning();
  const send = () => pushRows(rows);
  try {
    after(send); // kirim push setelah respons, aksi user tidak menunggu
  } catch {
    await send();
  }
}

/* ───────────── Web Push ───────────── */

let vapidReady: boolean | null = null;
export function pushConfigured() {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  vapidReady = !!(pub && priv);
  if (vapidReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub!, priv!);
  return vapidReady;
}
export const vapidPublicKey = () => (pushConfigured() ? process.env.VAPID_PUBLIC_KEY! : null);

async function pushRows(rows: (typeof s.notifications.$inferSelect)[]) {
  if (!rows.length || !pushConfigured()) return;
  const db = await getDb();
  const subs = await db.select().from(s.pushSubscriptions).where(inArray(s.pushSubscriptions.userId, [...new Set(rows.map((r) => r.userId))]));
  const unread = await db
    .select({ userId: s.notifications.userId, n: sql<number>`count(*)::int` })
    .from(s.notifications)
    .where(and(inArray(s.notifications.userId, [...new Set(rows.map((r) => r.userId))]), isNull(s.notifications.readAt)))
    .groupBy(s.notifications.userId);
  const dead: string[] = [];
  await Promise.all(
    rows.flatMap((r) =>
      subs
        .filter((sub) => sub.userId === r.userId)
        .map(async (sub) => {
          const payload = JSON.stringify({
            id: r.id,
            kind: r.kind,
            title: r.title,
            body: r.body,
            url: r.url ?? "/dashboard",
            tag: r.taskId ? `${r.taskId}:${r.kind}` : r.id,
            ts: r.createdAt.getTime(),
            unread: unread.find((u) => u.userId === r.userId)?.n ?? 1,
          });
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 60 * 60 * 24, urgency: r.kind === "overdue" || r.kind === "revision_requested" || r.kind === "task_assigned" ? "high" : "normal" });
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) dead.push(sub.id);
            else console.error("[push]", code, (e as Error).message);
          }
        }),
    ),
  );
  if (dead.length) await db.delete(s.pushSubscriptions).where(inArray(s.pushSubscriptions.id, dead));
}

/** Notifikasi uji ke diri sendiri (dari halaman Akun). */
export async function sendTestNotification(userId: string) {
  const db = await getDb();
  const d = compose("test", null, null);
  await deliver(db, [userId], { ...d, taskId: null, actorId: null });
}

/* ───────────── Pengingat SLA (cron ringan) ───────────── */

let lastSlaCheck = 0;
/** Cek deadline: dipanggil oleh polling lonceng (maks. tiap 5 menit per instance) & /api/cron/sla. */
export async function checkSla(force = false) {
  if (!force && Date.now() - lastSlaCheck < 5 * 60_000) return;
  lastSlaCheck = Date.now();
  try {
    const db = await getDb();
    const now = new Date();
    const soon = new Date(now.getTime() + 2 * 3600_000);
    const open = inArray(s.tasks.status, ["assigned", "in_progress"]);
    const [overdue, dueSoon] = await Promise.all([
      db.select({ id: s.tasks.id }).from(s.tasks).where(and(open, lt(s.tasks.dueAt, now))),
      db.select({ id: s.tasks.id }).from(s.tasks).where(and(open, gt(s.tasks.dueAt, now), lt(s.tasks.dueAt, soon))),
    ]);
    const already = async (kind: NotificationKind, ids: string[]) =>
      ids.length ? new Set((await db.selectDistinct({ id: s.notifications.taskId }).from(s.notifications).where(and(eq(s.notifications.kind, kind), inArray(s.notifications.taskId, ids)))).map((r) => r.id)) : new Set<string | null>();
    const [o, d] = await Promise.all([already("overdue", overdue.map((t) => t.id)), already("due_soon", dueSoon.map((t) => t.id))]);
    for (const t of overdue) if (!o.has(t.id)) await notifyTask("overdue", t.id, null);
    for (const t of dueSoon) if (!d.has(t.id)) await notifyTask("due_soon", t.id, null);
  } catch (e) {
    console.error("[sla]", e);
  }
}

/* ───────────── Data demo ───────────── */

/** Isi lonceng dengan riwayat yang masuk akal dari data task yang ada (sekali, saat tabel masih kosong). */
export async function seedDemoNotifications(db: DB) {
  if (process.env.DEMO_MODE === "false") return;
  // pengingat SLA bisa sudah tercatat lebih dulu — yang dicek hanya riwayat kejadian task
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.notifications).where(sql`${s.notifications.kind} not in ('due_soon', 'overdue', 'test')`);
  if (n > 0) return;
  const tasks = await db.select().from(s.tasks);
  const users = await db.select({ id: s.users.id, name: s.users.name }).from(s.users);
  const nameOf = (id: string | null) => (id ? (users.find((u) => u.id === id) ?? null) : null);
  const rows: Row[] = [];
  const now = Date.now();
  for (const t of tasks) {
    const ctx = await loadCtx(db, t.id);
    if (!ctx) continue;
    const push = (kind: NotificationKind, at: Date | null, actor: Actor, note?: string | null) => {
      if (!at) return;
      const d = compose(kind, ctx, actor, note);
      for (const userId of new Set(d.to)) {
        if (userId === actor?.id) continue;
        rows.push({ userId, kind, title: d.title, body: d.body, url: d.url, taskId: t.id, actorId: actor?.id ?? null, createdAt: at, readAt: now - at.getTime() > 20 * 3600_000 ? at : null });
      }
    };
    const creator = nameOf(t.createdBy);
    const tech = nameOf(ctx.assigneeIds[0] ?? null);
    push("task_assigned", t.createdAt, creator);
    if (t.startedAt) push("task_started", t.startedAt, tech, "Check-in di lokasi");
    if (t.lastSubmittedAt && ["submitted", "under_review", "approved", "finished", "revision"].includes(t.status)) push(t.revisionCount ? "report_resubmitted" : "report_submitted", t.lastSubmittedAt, tech);
    if (t.status === "revision") {
      const [rev] = await db.select().from(s.reviews).where(and(eq(s.reviews.taskId, t.id), eq(s.reviews.decision, "revision"))).orderBy(sql`${s.reviews.reviewedAt} desc`).limit(1);
      push("revision_requested", rev?.reviewedAt ?? t.updatedAt, nameOf(rev?.reviewerId ?? null), rev?.comments);
    }
    if (t.status === "finished") push("task_approved", t.approvedAt ?? t.finishedAt, creator);
    if (t.status === "cancelled") push("task_cancelled", t.cancelledAt, creator, t.cancelReason);
    if (["assigned", "in_progress"].includes(t.status) && t.dueAt && t.dueAt.getTime() < now) push("overdue", t.dueAt, null);
  }
  // simpan hanya 40 terbaru per user agar lonceng tidak penuh
  const byUser = new Map<string, Row[]>();
  for (const r of rows.sort((a, b) => +b.createdAt! - +a.createdAt!)) {
    const list = byUser.get(r.userId) ?? [];
    if (list.length < 40) list.push(r);
    byUser.set(r.userId, list);
  }
  const all = [...byUser.values()].flat();
  for (let i = 0; i < all.length; i += 200) await db.insert(s.notifications).values(all.slice(i, i + 200));
}

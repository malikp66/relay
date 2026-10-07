import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { after } from "next/server";
import { getDb, schema as s } from "@/db";
import { getCurrentUser } from "@/server/auth";
import { checkSla, vapidPublicKey } from "@/server/notifications";

/** Lonceng: 30 notifikasi terbaru + jumlah belum dibaca. Dipolling client (~20 dtk) & saat tab kembali aktif. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = await getDb();
  const [items, [{ n }]] = await Promise.all([
    db
      .select({ id: s.notifications.id, kind: s.notifications.kind, title: s.notifications.title, body: s.notifications.body, url: s.notifications.url, readAt: s.notifications.readAt, createdAt: s.notifications.createdAt })
      .from(s.notifications)
      .where(eq(s.notifications.userId, user.id))
      .orderBy(desc(s.notifications.createdAt))
      .limit(30),
    db.select({ n: sql<number>`count(*)::int` }).from(s.notifications).where(and(eq(s.notifications.userId, user.id), isNull(s.notifications.readAt))),
  ]);
  after(() => checkSla());
  return Response.json({ items, unread: n, vapidKey: vapidPublicKey() }, { headers: { "cache-control": "no-store" } });
}

/** Tandai dibaca dari service worker (aksi "Tandai dibaca" / saat notifikasi dibuka). */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = (body?.ids ?? []).filter((x) => typeof x === "string").slice(0, 100);
  if (ids.length) {
    const db = await getDb();
    await db
      .update(s.notifications)
      .set({ readAt: new Date() })
      .where(and(eq(s.notifications.userId, user.id), isNull(s.notifications.readAt), inArray(s.notifications.id, ids)));
  }
  return Response.json({ ok: true });
}

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { getCurrentUser } from "@/server/auth";

const sub = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }) });

/** Simpan langganan Web Push perangkat ini untuk user yang login (endpoint unik → pindah pemilik bila ganti akun). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = sub.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  const db = await getDb();
  await db
    .insert(s.pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: req.headers.get("user-agent")?.slice(0, 200) })
    .onConflictDoUpdate({ target: s.pushSubscriptions.endpoint, set: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth } });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) {
    const db = await getDb();
    await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.endpoint, body.endpoint));
  }
  return Response.json({ ok: true });
}

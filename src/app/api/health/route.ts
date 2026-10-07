import { pingDb } from "@/db";

/** Cek kesehatan: /api/health → { ok, db } — berguna untuk debug deploy. */
export async function GET() {
  try {
    const db = await pingDb();
    return Response.json({ ok: true, db });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

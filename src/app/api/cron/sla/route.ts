import { checkSla } from "@/server/notifications";

/** Pengingat deadline (due soon / overdue). Panggil dari cron (Vercel Cron mengirim Authorization: Bearer $CRON_SECRET). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  await checkSla(true);
  return Response.json({ ok: true });
}

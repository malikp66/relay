import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getCurrentUser } from "@/server/auth";

export async function GET(_req: Request, ctx: RouteContext<"/api/files/[name]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { name } = await ctx.params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const [f] = await db.select().from(s.files).where(eq(s.files.id, name));
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: { "content-type": f.mime, "content-length": String(f.size), "cache-control": "private, max-age=604800, immutable" },
  });
}

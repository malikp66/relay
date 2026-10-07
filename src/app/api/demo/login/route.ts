import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { createSession, destroySession } from "@/server/auth";

/** Demo: /api/demo/login?as=spv.budi&to=/review — masuk langsung sebagai akun demo. Nonaktif jika DEMO_MODE=false. */
export async function GET(request: Request) {
  if (process.env.DEMO_MODE === "false") return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const username = url.searchParams.get("as") ?? "";
  const to = url.searchParams.get("to") ?? "/dashboard";
  const db = await getDb();
  const [user] = await db.select().from(s.users).where(eq(s.users.username, username));
  if (!user || !user.isActive) redirect("/login");
  await destroySession();
  await createSession(user.id);
  redirect(to.startsWith("/") ? to : "/dashboard");
}

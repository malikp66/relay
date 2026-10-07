import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/server/auth";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_req: Request, ctx: RouteContext<"/api/files/[name]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { name } = await ctx.params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), {
      headers: { "content-type": TYPES[name.split(".").pop()!], "cache-control": "private, max-age=604800, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

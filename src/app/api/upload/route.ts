import { randomUUID } from "node:crypto";
import { getDb, schema as s } from "@/db";
import { getCurrentUser } from "@/server/auth";

const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 4 * 1024 * 1024; // sudah dikompres di HP (±300 KB); batas aman body serverless

/** Upload foto bukti → disimpan di tabel `files` (jalan di serverless tanpa disk persisten). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sesi berakhir. Masuk lagi." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "File tidak ada." }, { status: 400 });
  const ext = ALLOWED[file.type];
  if (!ext) return Response.json({ error: "Hanya foto JPG, PNG, atau WebP." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Ukuran foto maksimal 4 MB." }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isWebp = buf.subarray(8, 12).toString() === "WEBP";
  if (!(isJpg || isPng || isWebp)) return Response.json({ error: "File bukan gambar yang valid." }, { status: 400 });
  const id = `${randomUUID()}.${ext}`;
  const db = await getDb();
  await db.insert(s.files).values({ id, mime: file.type, size: buf.length, data: buf, uploadedBy: user.id });
  return Response.json({ url: `/api/files/${id}` });
}

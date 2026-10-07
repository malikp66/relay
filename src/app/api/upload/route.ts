import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/server/auth";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 10 * 1024 * 1024;

/** Upload foto bukti. Demo: disimpan lokal; production: presigned URL ke R2/S3. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "File tidak ada." }, { status: 400 });
  const ext = ALLOWED[file.type];
  if (!ext) return Response.json({ error: "Hanya foto JPG, PNG, atau WebP." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Ukuran foto maksimal 10 MB." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  // validasi magic bytes
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isWebp = buf.subarray(8, 12).toString() === "WEBP";
  if (!(isJpg || isPng || isWebp)) return Response.json({ error: "File bukan gambar yang valid." }, { status: 400 });
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return Response.json({ url: `/api/files/${name}` });
}

"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { createSession, destroySession, requireUser } from "@/server/auth";

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Username dan password wajib diisi." };
  const db = await getDb();
  const [user] = await db.select().from(s.users).where(eq(s.users.username, username));
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Username atau password salah." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) return { error: "Password baru minimal 8 karakter." };
  const db = await getDb();
  const [row] = await db.select().from(s.users).where(eq(s.users.id, user.id));
  if (!(await bcrypt.compare(current, row.passwordHash))) return { error: "Password lama salah." };
  await db.update(s.users).set({ passwordHash: await bcrypt.hash(next, 8) }).where(eq(s.users.id, user.id));
  return { ok: true, message: "Password berhasil diganti." };
}

/** Khusus demo: pindah akun tanpa password supaya PM bisa melihat tiap role. Matikan dengan DEMO_MODE=false. */
export async function switchDemoUserAction(username: string) {
  if (process.env.DEMO_MODE === "false") throw new Error("Demo mode nonaktif");
  const db = await getDb();
  const [user] = await db.select().from(s.users).where(eq(s.users.username, username));
  if (!user || !user.isActive) throw new Error("Akun tidak ditemukan");
  await destroySession();
  await createSession(user.id);
  redirect("/dashboard");
}

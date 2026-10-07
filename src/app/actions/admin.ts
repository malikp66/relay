"use server";

import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { DEMO_PASSWORD, resetDemo } from "@/db/seed";
import { requireUser } from "@/server/auth";
import type { Result } from "./tasks";

const fail = (e: unknown): Result => {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Data tidak valid." };
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("unique") || msg.includes("duplicate")) return { ok: false, error: "Data dengan kode/username yang sama sudah ada." };
  if (msg.includes("foreign key")) return { ok: false, error: "Data masih dipakai di tempat lain, tidak bisa dihapus." };
  return { ok: false, error: msg || "Terjadi kesalahan." };
};

async function admin() {
  const user = await requireUser(["admin"]);
  return { user, db: await getDb() };
}

async function audit(actorId: string, entity: string, action: string, summary: string, entityId?: string) {
  const db = await getDb();
  await db.insert(s.auditLogs).values({ actorId, entity, action, summary, entityId });
}

const done = (): Result => {
  revalidatePath("/", "layout");
  return { ok: true };
};

/* ───────────── Users ───────────── */

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nama minimal 2 karakter."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._]{3,}$/, "Username minimal 3 karakter (huruf kecil, angka, titik)."),
  role: z.enum(["admin", "supervisor", "technician"]),
  title: z.string().optional(),
  phone: z.string().optional(),
  groupId: z.string().optional(),
});

export async function saveUserAction(input: z.input<typeof userSchema>): Promise<Result> {
  try {
    const { user, db } = await admin();
    const d = userSchema.parse(input);
    let id = d.id;
    if (id) {
      await db.update(s.users).set({ name: d.name, username: d.username, role: d.role, title: d.title || null, phone: d.phone || null }).where(eq(s.users.id, id));
    } else {
      const [row] = await db
        .insert(s.users)
        .values({ name: d.name, username: d.username, role: d.role, title: d.title || null, phone: d.phone || null, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 8) })
        .returning();
      id = row.id;
    }
    await db.delete(s.groupMembers).where(eq(s.groupMembers.userId, id));
    if (d.groupId && d.role !== "admin") {
      await db.insert(s.groupMembers).values({ groupId: d.groupId, userId: id, memberRole: d.role === "supervisor" ? "supervisor" : "technician" });
    }
    await audit(user.id, "user", d.id ? "update" : "create", `${d.id ? "Mengubah" : "Menambah"} user ${d.name} (${d.role})`, id);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function toggleUserActiveAction(id: string): Promise<Result> {
  try {
    const { user, db } = await admin();
    if (id === user.id) return { ok: false, error: "Tidak bisa menonaktifkan akun sendiri." };
    const [u] = await db.select().from(s.users).where(eq(s.users.id, id));
    await db.update(s.users).set({ isActive: !u.isActive }).where(eq(s.users.id, id));
    if (u.isActive) await db.delete(s.sessions).where(eq(s.sessions.userId, id));
    await audit(user.id, "user", u.isActive ? "deactivate" : "activate", `${u.isActive ? "Menonaktifkan" : "Mengaktifkan"} ${u.name}`, id);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function resetPasswordAction(id: string): Promise<Result> {
  try {
    const { user, db } = await admin();
    const [u] = await db.update(s.users).set({ passwordHash: await bcrypt.hash(DEMO_PASSWORD, 8) }).where(eq(s.users.id, id)).returning();
    await db.delete(s.sessions).where(eq(s.sessions.userId, id));
    await audit(user.id, "user", "reset_password", `Reset password ${u.name}`, id);
    return done();
  } catch (e) {
    return fail(e);
  }
}

/* ───────────── Groups / org tree ───────────── */

export async function saveGroupAction(input: { id?: string; name: string; code: string; description?: string; categoryIds: string[] }): Promise<Result> {
  try {
    const { user, db } = await admin();
    const d = z
      .object({ id: z.string().optional(), name: z.string().trim().min(2, "Nama group wajib diisi."), code: z.string().trim().toUpperCase().min(2, "Kode wajib diisi."), description: z.string().optional(), categoryIds: z.array(z.string()) })
      .parse(input);
    let id = d.id;
    if (id) await db.update(s.groups).set({ name: d.name, code: d.code, description: d.description || null }).where(eq(s.groups.id, id));
    else {
      const [root] = await db.select().from(s.groups).where(eq(s.groups.code, "FIELD-OPS"));
      const [g] = await db.insert(s.groups).values({ name: d.name, code: d.code, description: d.description || null, parentId: root?.id ?? null }).returning();
      id = g.id;
    }
    await db.delete(s.groupScopes).where(eq(s.groupScopes.groupId, id));
    if (d.categoryIds.length) await db.insert(s.groupScopes).values(d.categoryIds.map((categoryId) => ({ groupId: id!, categoryId })));
    await audit(user.id, "group", d.id ? "update" : "create", `${d.id ? "Mengubah" : "Membuat"} group ${d.name}`, id);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function moveMemberAction(userId: string, groupId: string): Promise<Result> {
  try {
    const { user, db } = await admin();
    const [u] = await db.select().from(s.users).where(eq(s.users.id, userId));
    await db.delete(s.groupMembers).where(eq(s.groupMembers.userId, userId));
    await db.insert(s.groupMembers).values({ groupId, userId, memberRole: u.role === "supervisor" ? "supervisor" : "technician" });
    const [g] = await db.select().from(s.groups).where(eq(s.groups.id, groupId));
    await audit(user.id, "group", "move_member", `Memindahkan ${u.name} ke ${g.name}`, groupId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

/* ───────────── Master data ───────────── */

type MasterKind = "categories" | "products" | "priorities" | "customers" | "sites";

const masterSchemas = {
  categories: z.object({ name: z.string().trim().min(2, "Nama wajib diisi."), code: z.string().trim().toUpperCase().min(2, "Kode wajib diisi."), isScheduled: z.boolean().default(false), description: z.string().optional() }),
  products: z.object({ name: z.string().trim().min(2, "Nama wajib diisi."), code: z.string().trim().toUpperCase().min(2, "Kode wajib diisi.") }),
  priorities: z.object({ name: z.string().trim().min(2, "Nama wajib diisi."), level: z.coerce.number().int().min(1).max(9), slaHours: z.coerce.number().int().min(1, "SLA minimal 1 jam.") }),
  customers: z.object({ name: z.string().trim().min(2, "Nama wajib diisi."), customerNo: z.string().trim().min(3, "No. pelanggan wajib diisi."), phone: z.string().optional(), address: z.string().optional(), service: z.string().optional() }),
  sites: z.object({
    name: z.string().trim().min(2, "Nama wajib diisi."),
    address: z.string().trim().min(5, "Alamat wajib diisi."),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusM: z.coerce.number().int().min(20).max(5000),
    customerId: z.string().optional(),
  }),
} as const;

const tables = { categories: s.categories, products: s.products, priorities: s.priorities, customers: s.customers, sites: s.sites } as const;

export async function saveMasterAction(kind: MasterKind, id: string | null, input: Record<string, unknown>): Promise<Result> {
  try {
    const { user, db } = await admin();
    const data = masterSchemas[kind].parse(input) as Record<string, unknown>;
    if ("customerId" in data && !data.customerId) data.customerId = null;
    const table = tables[kind];
    if (id) await db.update(table).set(data).where(eq(table.id, id));
    else await db.insert(table).values(data as never);
    await audit(user.id, kind, id ? "update" : "create", `${id ? "Mengubah" : "Menambah"} ${kind}: ${String(data.name)}`, id ?? undefined);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMasterAction(kind: MasterKind, id: string): Promise<Result> {
  try {
    const { user, db } = await admin();
    const table = tables[kind];
    await db.delete(table).where(eq(table.id, id));
    await audit(user.id, kind, "delete", `Menghapus ${kind}`, id);
    return done();
  } catch (e) {
    return fail(e);
  }
}

/* ───────────── Template checklist ───────────── */

export async function addTemplateItemAction(templateId: string, item: { label: string; type: "tick" | "data" | "photo"; unit?: string; required: boolean }): Promise<Result> {
  try {
    const user = await requireUser(["admin", "supervisor"]);
    const db = await getDb();
    if (!item.label.trim()) return { ok: false, error: "Label wajib diisi." };
    const [{ n }] = await db.select({ n: sql<number>`coalesce(max(sort), -1)::int` }).from(s.checklistTemplateItems).where(eq(s.checklistTemplateItems.templateId, templateId));
    await db.insert(s.checklistTemplateItems).values({ templateId, label: item.label.trim(), type: item.type, unit: item.unit || null, required: item.required, sort: n + 1 });
    await audit(user.id, "checklist_template", "add_item", `Menambah item "${item.label}"`, templateId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function updateTemplateItemAction(itemId: string, patch: { required?: boolean; label?: string }): Promise<Result> {
  try {
    await requireUser(["admin", "supervisor"]);
    const db = await getDb();
    await db.update(s.checklistTemplateItems).set(patch).where(eq(s.checklistTemplateItems.id, itemId));
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTemplateItemAction(itemId: string): Promise<Result> {
  try {
    const user = await requireUser(["admin", "supervisor"]);
    const db = await getDb();
    const [it] = await db.delete(s.checklistTemplateItems).where(eq(s.checklistTemplateItems.id, itemId)).returning();
    await audit(user.id, "checklist_template", "delete_item", `Menghapus item "${it?.label}"`, it?.templateId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function moveTemplateItemAction(itemId: string, dir: -1 | 1): Promise<Result> {
  try {
    await requireUser(["admin", "supervisor"]);
    const db = await getDb();
    const [it] = await db.select().from(s.checklistTemplateItems).where(eq(s.checklistTemplateItems.id, itemId));
    const siblings = (await db.select().from(s.checklistTemplateItems).where(eq(s.checklistTemplateItems.templateId, it.templateId))).sort((a, b) => a.sort - b.sort);
    const idx = siblings.findIndex((x) => x.id === itemId);
    const other = siblings[idx + dir];
    if (!other) return { ok: true };
    await db.update(s.checklistTemplateItems).set({ sort: other.sort }).where(eq(s.checklistTemplateItems.id, it.id));
    await db.update(s.checklistTemplateItems).set({ sort: it.sort }).where(and(eq(s.checklistTemplateItems.id, other.id)));
    return done();
  } catch (e) {
    return fail(e);
  }
}

/** Simpan urutan baru hasil drag & drop (ids = urutan lengkap item template). */
export async function reorderTemplateItemsAction(templateId: string, ids: string[]): Promise<Result> {
  try {
    const user = await requireUser(["admin", "supervisor"]);
    const db = await getDb();
    const rows = await db.select({ id: s.checklistTemplateItems.id }).from(s.checklistTemplateItems).where(eq(s.checklistTemplateItems.templateId, templateId));
    const known = new Set(rows.map((r) => r.id));
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) return { ok: false, error: "Urutan tidak valid, muat ulang halaman." };
    await db.transaction(async (tx) => {
      for (const [i, id] of ids.entries()) await tx.update(s.checklistTemplateItems).set({ sort: i }).where(eq(s.checklistTemplateItems.id, id));
    });
    await audit(user.id, "checklist_template", "reorder", "Mengubah urutan item", templateId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

/* ───────────── Demo ───────────── */

export async function resetDemoAction(): Promise<Result> {
  try {
    const { db } = await admin();
    await resetDemo(db);
    return done();
  } catch (e) {
    return fail(e);
  }
}

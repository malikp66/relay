import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import type { CurrentUser } from "./auth";

export type SetupItem = { id: string; title: string; description: string; href: string; done: boolean };

const count = (rows: { n: number }[]) => rows[0]?.n ?? 0;

/** Langkah awal per role, status selesai dihitung dari data nyata. Teknisi: dicek di perangkat (client). */
export async function setupItems(user: CurrentUser): Promise<SetupItem[]> {
  const db = await getDb();
  const n = sql<number>`count(*)::int`;
  if (user.role === "admin") {
    const [groups, scoped, spv, tech, sites, tpls] = await Promise.all([
      db.select({ n }).from(s.groups).where(sql`${s.groups.parentId} is not null`),
      db.select({ n: sql<number>`count(distinct ${s.groupScopes.groupId})::int` }).from(s.groupScopes),
      db.select({ n }).from(s.users).where(and(eq(s.users.role, "supervisor"), eq(s.users.isActive, true))),
      db.select({ n }).from(s.users).where(and(eq(s.users.role, "technician"), eq(s.users.isActive, true))),
      db.select({ n }).from(s.sites),
      db.select({ n }).from(s.checklistTemplates),
    ]);
    const [anyTask] = await db.select({ n }).from(s.tasks);
    return [
      { id: "crew", title: "Buat crew & tentukan kategorinya", description: "Mis. Crew A menangani Troubleshoot, Crew B Maintenance.", href: "/admin/groups", done: count(groups) > 0 && count(scoped) >= count(groups) },
      { id: "users", title: "Tambahkan supervisor & teknisi", description: "Masukkan user lalu pasang ke crew masing-masing.", href: "/admin/users", done: count(spv) > 0 && count(tech) > 0 },
      { id: "sites", title: "Daftarkan lokasi kerja", description: "Site pelanggan & infrastruktur dengan titik peta untuk check-in.", href: "/admin/locations", done: count(sites) > 0 },
      { id: "templates", title: "Siapkan template checklist", description: "Item checklist per kategori × produk.", href: "/templates", done: count(tpls) > 0 },
      { id: "first-task", title: "Task pertama dibuat supervisor", description: "Tanda Relay sudah dipakai di lapangan.", href: "/tasks", done: anyTask.n > 0 },
    ];
  }
  if (user.role === "supervisor") {
    const groups = user.supervisedGroupIds.length ? user.supervisedGroupIds : ["-"];
    const [created, reviewed, members, plans] = await Promise.all([
      db.select({ n }).from(s.tasks).where(eq(s.tasks.createdBy, user.id)),
      db.select({ n }).from(s.reviews).where(eq(s.reviews.reviewerId, user.id)),
      db.select({ n }).from(s.groupMembers).where(and(inArray(s.groupMembers.groupId, groups), eq(s.groupMembers.memberRole, "technician"))),
      db.select({ n }).from(s.maintenancePlans).where(inArray(s.maintenancePlans.groupId, groups)),
    ]);
    return [
      { id: "team", title: "Cek anggota crew kamu", description: "Pastikan semua teknisi sudah terdaftar di crew.", href: "/attendance", done: count(members) > 0 },
      { id: "first-task", title: "Buat task pertama", description: "Pilih kategori & produk, checklist terisi otomatis.", href: "/tasks/new", done: count(created) > 0 },
      { id: "review", title: "Review laporan pertama", description: "Setujui atau minta revisi dengan komentar.", href: "/review", done: count(reviewed) > 0 },
      { id: "plan", title: "Atur maintenance berulang", description: "Opsional, untuk pekerjaan rutin mingguan/bulanan.", href: "/schedule", done: count(plans) > 0 },
    ];
  }
  return [];
}

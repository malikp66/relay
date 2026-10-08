import { requireUser } from "@/server/auth";
import { asc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { OrgTree } from "./org-tree";

export const metadata = { title: "Crew & org" };

export default async function GroupsPage() {
  await requireUser(["admin"]);
  const db = await getDb();
  const [groups, members, users, scopes, categories] = await Promise.all([
    db.select().from(s.groups).orderBy(asc(s.groups.name)),
    db.select().from(s.groupMembers),
    db.select({ id: s.users.id, name: s.users.name, role: s.users.role, isActive: s.users.isActive }).from(s.users).orderBy(asc(s.users.name)),
    db.select().from(s.groupScopes),
    db.select().from(s.categories),
  ]);
  const root = groups.find((g) => !g.parentId);
  return (
    <OrgTree
      rootName={root?.name ?? "Perusahaan"}
      groups={groups
        .filter((g) => g.parentId)
        .map((g) => ({
          id: g.id,
          name: g.name,
          code: g.code,
          description: g.description ?? "",
          categoryIds: scopes.filter((x) => x.groupId === g.id).map((x) => x.categoryId),
          members: members.filter((m) => m.groupId === g.id).map((m) => ({ ...users.find((u) => u.id === m.userId)!, memberRole: m.memberRole })),
        }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      unassigned={users.filter((u) => u.role !== "admin" && !members.some((m) => m.userId === u.id))}
    />
  );
}

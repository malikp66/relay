import { asc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { UsersView } from "./users-view";

export const metadata = { title: "User" };

export default async function UsersPage() {
  const db = await getDb();
  const [users, members, groups] = await Promise.all([
    db.select().from(s.users).orderBy(asc(s.users.role), asc(s.users.name)),
    db.select().from(s.groupMembers),
    db.select().from(s.groups).orderBy(asc(s.groups.name)),
  ]);
  return (
    <UsersView
      users={users.map((u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, title: u.title ?? "", phone: u.phone ?? "", isActive: u.isActive, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, groupId: members.find((m) => m.userId === u.id)?.groupId ?? "" }))}
      groups={groups.filter((g) => g.parentId).map((g) => ({ id: g.id, name: g.name }))}
    />
  );
}

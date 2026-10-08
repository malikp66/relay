import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { and, eq, gt } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import type { Role } from "@/db/schema";

const COOKIE = "relay_session";
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  name: string;
  username: string;
  role: Role;
  title: string | null;
  phone: string | null;
  /** group yang disupervisi (untuk supervisor) */
  supervisedGroupIds: string[];
  /** group tempat user menjadi teknisi */
  memberGroupIds: string[];
  groupNames: string[];
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600_000);
  await db.insert(s.sessions).values({ id: hashToken(token), userId, expiresAt });
  await db.update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, userId));
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(s.sessions).where(eq(s.sessions.id, hashToken(token)));
  }
  jar.delete(COOKIE);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  // Satu query: sesi + user + keanggotaan crew (dipanggil di setiap halaman, jadi hemat putaran ke DB)
  const rows = await db
    .select({ user: s.users, groupId: s.groupMembers.groupId, memberRole: s.groupMembers.memberRole, groupName: s.groups.name })
    .from(s.sessions)
    .innerJoin(s.users, eq(s.users.id, s.sessions.userId))
    .leftJoin(s.groupMembers, eq(s.groupMembers.userId, s.users.id))
    .leftJoin(s.groups, eq(s.groups.id, s.groupMembers.groupId))
    .where(and(eq(s.sessions.id, hashToken(token)), gt(s.sessions.expiresAt, new Date()), eq(s.users.isActive, true)));
  const row = rows[0];
  if (!row) return null;
  const memberships = rows.filter((r) => r.groupId).map((r) => ({ groupId: r.groupId!, memberRole: r.memberRole!, name: r.groupName! }));
  return {
    id: row.user.id,
    name: row.user.name,
    username: row.user.username,
    role: row.user.role,
    title: row.user.title,
    phone: row.user.phone,
    supervisedGroupIds: memberships.filter((m) => m.memberRole === "supervisor").map((m) => m.groupId),
    memberGroupIds: memberships.filter((m) => m.memberRole === "technician").map((m) => m.groupId),
    groupNames: memberships.map((m) => m.name),
  };
});

export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) forbidden();
  return user;
}

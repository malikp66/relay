import "server-only";
import { eq, exists, inArray, sql, and, type SQL } from "drizzle-orm";
import { schema as s } from "@/db";
import type { CurrentUser } from "./auth";

type TaskLike = { id: string; groupId: string };

/** Filter task yang boleh dilihat user (dipakai di semua query list/statistik). */
export function taskScope(user: CurrentUser): SQL | undefined {
  if (user.role === "admin") return undefined;
  if (user.role === "supervisor") {
    return user.supervisedGroupIds.length ? inArray(s.tasks.groupId, user.supervisedGroupIds) : sql`false`;
  }
  return exists(
    sql`(select 1 from ${s.taskAssignees} where ${s.taskAssignees.taskId} = ${s.tasks.id} and ${s.taskAssignees.userId} = ${user.id})`,
  );
}

export function canViewTask(user: CurrentUser, task: TaskLike, assigneeIds: string[]) {
  if (user.role === "admin") return true;
  if (user.role === "supervisor") return user.supervisedGroupIds.includes(task.groupId);
  return assigneeIds.includes(user.id);
}

/** Supervisor group terkait atau Admin: buat, ubah, cancel, review. */
export function canManageTask(user: CurrentUser, task: TaskLike) {
  if (user.role === "admin") return true;
  return user.role === "supervisor" && user.supervisedGroupIds.includes(task.groupId);
}

/** Hanya teknisi yang di-assign yang mengerjakan checklist/laporan. */
export function isAssignee(user: CurrentUser, assigneeIds: string[]) {
  return user.role === "technician" && assigneeIds.includes(user.id);
}

export function groupScopeFor(user: CurrentUser) {
  if (user.role === "admin") return undefined;
  const ids = user.role === "supervisor" ? user.supervisedGroupIds : user.memberGroupIds;
  return ids.length ? inArray(s.groups.id, ids) : sql`false`;
}

export function andAll(...conds: (SQL | undefined)[]) {
  const list = conds.filter(Boolean) as SQL[];
  return list.length ? and(...list) : undefined;
}

export { eq };

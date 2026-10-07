import { forbidden, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { requireUser } from "@/server/auth";
import { getTaskDetail } from "@/server/queries";
import { canManageTask, isAssignee } from "@/server/policy";
import { CHECKLIST_EDITABLE, REPORT_EDITABLE } from "@/server/workflow";
import { TaskView } from "./task-view";

export async function generateMetadata({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  const db = await getDb();
  const [t] = await db.select({ code: s.tasks.code }).from(s.tasks).where(eq(s.tasks.id, id));
  return { title: t?.code ?? "Task" };
}

export default async function TaskPage({ params, searchParams }: PageProps<"/tasks/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const detail = await getTaskDetail(user, id);
  if (!detail) notFound();
  if (detail === "forbidden") forbidden();
  const assigneeIds = detail.assignees.map((a) => a.id);
  const mine = isAssignee(user, assigneeIds);
  const checkedInHere = detail.attendance.some((a) => a.a.userId === user.id);
  const openHere = detail.attendance.find((a) => a.a.userId === user.id && !a.a.checkOutAt);
  const perms = {
    isAssignee: mine,
    canManage: canManageTask(user, detail.task),
    canEditChecklist: mine && CHECKLIST_EDITABLE.includes(detail.task.status) && (checkedInHere || detail.task.status !== "in_progress"),
    canEditReport: mine && REPORT_EDITABLE.includes(detail.task.status),
    checkedInHere,
    openHere: !!openHere,
    openElsewhere: detail.myOpenAttendance && detail.myOpenAttendance.taskId !== id ? detail.myOpenAttendance.code : null,
  };
  return <TaskView detail={detail} perms={perms} role={user.role} initialTab={typeof sp.tab === "string" ? sp.tab : undefined} />;
}

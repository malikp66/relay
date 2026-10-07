import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listTasks, masterData, technicians, type TaskFilters } from "@/server/queries";
import { TaskCard } from "@/components/relay/task-card";
import { EmptyState, PageHeader } from "@/components/relay/page";
import { Button } from "@/components/ui/button";
import { TaskFilterBar } from "./filter-bar";
import type { TaskStatus } from "@/db/schema";

export const metadata = { title: "Tugas" };

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const user = await requireUser();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const view = (one("view") ?? "active") as TaskFilters["view"];
  const filters: TaskFilters = {
    view,
    q: one("q"),
    groupId: one("group"),
    categoryId: one("category"),
    productId: one("product"),
    priorityId: one("priority"),
    assigneeId: one("assignee"),
    status: one("status") ? (one("status")!.split(",") as TaskStatus[]) : undefined,
  };
  const [tasks, md, techs, counts] = await Promise.all([
    listTasks(user, filters),
    masterData(),
    user.role === "technician" ? Promise.resolve([]) : technicians(user.role === "supervisor" ? user.supervisedGroupIds : undefined),
    Promise.all((["active", "review", "overdue", "done"] as const).map(async (v) => [v, (await listTasks(user, { view: v, limit: 999 })).length] as const)),
  ]);
  const canCreate = user.role !== "technician";
  const groups = user.role === "admin" ? md.groups.filter((g) => g.parentId) : md.groups.filter((g) => user.supervisedGroupIds.includes(g.id));

  return (
    <div>
      <PageHeader
        title={user.role === "technician" ? "Tugas saya" : "Tugas"}
        subtitle={user.role === "supervisor" ? user.groupNames.join(", ") : user.role === "admin" ? "Semua crew" : "Task yang ditugaskan ke kamu"}
        action={
          canCreate ? (
            <Button asChild className="hidden h-10 rounded-xl md:inline-flex">
              <Link href="/tasks/new">
                <Plus className="size-4" /> Buat task
              </Link>
            </Button>
          ) : null
        }
      />
      <TaskFilterBar
        view={view ?? "active"}
        counts={Object.fromEntries(counts)}
        showReview={user.role !== "technician"}
        options={{
          groups: user.role === "admin" ? groups.map((g) => ({ id: g.id, name: g.name })) : [],
          categories: md.categories.map((c) => ({ id: c.id, name: c.name })),
          products: md.products.map((p) => ({ id: p.id, name: p.name })),
          priorities: md.priorities.map((p) => ({ id: p.id, name: p.name })),
          assignees: techs.map((t) => ({ id: t.id, name: t.name })),
        }}
      />
      <div className="mt-4">
        {tasks.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} showGroup={user.role === "admin"} />
            ))}
          </div>
        ) : (
          <EmptyState icon={ClipboardList} title="Tidak ada task" description="Coba ubah filter atau kata kunci pencarian." />
        )}
      </div>
      {canCreate && (
        <Link href="/tasks/new" aria-label="Buat task" className="press fixed bottom-24 right-4 z-30 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_8px_20px_-4px_color-mix(in_oklab,var(--primary)_55%,transparent)] md:hidden">
          <Plus className="size-6" />
        </Link>
      )}
    </div>
  );
}

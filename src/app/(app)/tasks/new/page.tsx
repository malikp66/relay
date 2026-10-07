import { notInArray, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { requireUser } from "@/server/auth";
import { checklistTemplatesWithItems, masterData, technicians } from "@/server/queries";
import { PageHeader } from "@/components/relay/page";
import { NewTaskForm } from "./new-task-form";

export const metadata = { title: "Buat task" };

export default async function NewTaskPage() {
  const user = await requireUser(["admin", "supervisor"]);
  const db = await getDb();
  const [md, templates, techs, load] = await Promise.all([
    masterData(),
    checklistTemplatesWithItems(),
    technicians(user.role === "supervisor" ? user.supervisedGroupIds : undefined),
    db
      .select({ userId: s.taskAssignees.userId, n: sql<number>`count(*)::int` })
      .from(s.taskAssignees)
      .innerJoin(s.tasks, sql`${s.tasks.id} = ${s.taskAssignees.taskId}`)
      .where(notInArray(s.tasks.status, ["finished", "cancelled"]))
      .groupBy(s.taskAssignees.userId),
  ]);
  const allowedGroups = user.role === "admin" ? md.groups.map((g) => g.id) : user.supervisedGroupIds;
  const categories = md.categories
    .map((c) => ({ ...c, groupId: md.scopes.find((sc) => sc.categoryId === c.id)?.groupId ?? null }))
    .filter((c) => c.groupId && allowedGroups.includes(c.groupId));

  return (
    <div className="pb-24">
      <PageHeader title="Buat task" subtitle="Checklist terisi otomatis dari template kategori & produk." />
      <NewTaskForm
        categories={categories.map((c) => ({ id: c.id, name: c.name, code: c.code, groupId: c.groupId!, groupName: md.groups.find((g) => g.id === c.groupId)?.name ?? "" }))}
        products={md.products.map((p) => ({ id: p.id, name: p.name }))}
        priorities={md.priorities.map((p) => ({ id: p.id, name: p.name, level: p.level, slaHours: p.slaHours }))}
        sites={md.sites.map((x) => ({ id: x.id, name: x.name, address: x.address, customerId: x.customerId }))}
        customers={md.customers.map((c) => ({ id: c.id, name: c.name, customerNo: c.customerNo }))}
        technicians={techs.map((t) => ({ ...t, load: load.find((l) => l.userId === t.id)?.n ?? 0 }))}
        templates={templates.map((t) => ({ categoryId: t.categoryId, productId: t.productId, items: t.items.map((i) => ({ label: i.label, type: i.type, unit: i.unit ?? "", required: i.required })) }))}
      />
    </div>
  );
}

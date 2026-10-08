import { eq, sql } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { checklistTemplatesWithItems } from "@/server/queries";
import { getDb, schema as s } from "@/db";
import { PageHeader } from "@/components/relay/page";
import { TemplatesView } from "./templates-view";

export const metadata = { title: "Template" };

export default async function TemplatesPage() {
  const user = await requireUser(["admin", "supervisor"]);
  const db = await getDb();
  const [templates, reportTemplates, usage] = await Promise.all([
    checklistTemplatesWithItems(),
    db
      .select({ tpl: s.reportTemplates, categoryCode: s.categories.code, categoryName: s.categories.name, editorName: s.users.name })
      .from(s.reportTemplates)
      .innerJoin(s.categories, eq(s.categories.id, s.reportTemplates.categoryId))
      .leftJoin(s.users, eq(s.users.id, s.reportTemplates.updatedBy)),
    db.select({ templateId: s.reports.templateId, n: sql<number>`count(*)::int` }).from(s.reports).groupBy(s.reports.templateId),
  ]);
  return (
    <div>
      <PageHeader title="Template" subtitle="Checklist per kategori × produk dan form laporan per kategori. Perubahan hanya berlaku untuk task baru." />
      <TemplatesView
        templates={templates.map((t) => ({ id: t.id, name: t.name, categoryCode: t.categoryCode, productName: t.productName, productIcon: t.productIcon, items: t.items.map((i) => ({ id: i.id, label: i.label, type: i.type, unit: i.unit, required: i.required })) }))}
        reportTemplates={reportTemplates.map((r) => ({
          id: r.tpl.id,
          name: r.tpl.name,
          categoryCode: r.categoryCode,
          categoryName: r.categoryName,
          fields: r.tpl.fields,
          version: r.tpl.version,
          updatedAt: r.tpl.updatedAt.toISOString(),
          editorName: r.editorName,
          reportCount: usage.find((u) => u.templateId === r.tpl.id)?.n ?? 0,
        }))}
        canEditReport={user.role === "admin"}
      />
    </div>
  );
}

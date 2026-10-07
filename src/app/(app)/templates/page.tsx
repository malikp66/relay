import { requireUser } from "@/server/auth";
import { checklistTemplatesWithItems } from "@/server/queries";
import { getDb, schema as s } from "@/db";
import { PageHeader } from "@/components/relay/page";
import { TemplatesView } from "./templates-view";

export const metadata = { title: "Template" };

export default async function TemplatesPage() {
  const user = await requireUser(["admin", "supervisor"]);
  const db = await getDb();
  const [templates, reportTemplates] = await Promise.all([checklistTemplatesWithItems(), db.select().from(s.reportTemplates)]);
  return (
    <div>
      <PageHeader title="Template" subtitle="Checklist per kategori × produk. Perubahan hanya berlaku untuk task baru." />
      <TemplatesView
        templates={templates.map((t) => ({ id: t.id, name: t.name, categoryCode: t.categoryCode, productName: t.productName, items: t.items.map((i) => ({ id: i.id, label: i.label, type: i.type, unit: i.unit, required: i.required })) }))}
        reportTemplates={reportTemplates.map((r) => ({ id: r.id, name: r.name, fields: r.fields }))}
        canEditReport={user.role === "admin"}
      />
    </div>
  );
}

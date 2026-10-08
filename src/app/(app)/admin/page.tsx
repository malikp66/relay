import { requireUser } from "@/server/auth";
import { sql } from "drizzle-orm";
import { Building2, ClipboardList, Database, MapPin, ScrollText, Users } from "lucide-react";
import { getDb, schema as s } from "@/db";
import { Alert } from "@/components/relay/alert";
import { LinkCard } from "@/components/relay/link-card";
import { ResetDemoButton } from "./reset-demo";

function Count({ n }: { n: number }) {
  return <span className="tabular rounded-md bg-foreground/[0.05] px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{n}</span>;
}

export default async function AdminHome() {
  await requireUser(["admin"]);
  const db = await getDb();
  const count = async (t: typeof s.users | typeof s.groups | typeof s.sites | typeof s.customers | typeof s.tasks | typeof s.checklistTemplates) =>
    (await db.select({ n: sql<number>`count(*)::int` }).from(t))[0].n;
  const [users, groups, sites, customers, tasks, tpls] = await Promise.all([count(s.users), count(s.groups), count(s.sites), count(s.customers), count(s.tasks), count(s.checklistTemplates)]);
  return (
    <div className="space-y-5">
      <div data-tour="admin-cards" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LinkCard href="/admin/users" icon={Users} color="#2563eb" title="User" description="Akun, role, dan keanggotaan crew. Reset password & nonaktifkan." meta={<Count n={users} />} />
        <LinkCard href="/admin/groups" icon={Building2} color="#7c3aed" title="Crew & org tree" description="Struktur crew, supervisor, teknisi, dan kategori yang ditangani." meta={<Count n={groups - 1} />} />
        <LinkCard href="/admin/locations" icon={MapPin} color="#e11d48" title="Lokasi & pelanggan" description={`Site dengan titik peta & radius check-in. ${customers} pelanggan.`} meta={<Count n={sites} />} />
        <LinkCard href="/templates" icon={ClipboardList} color="#ea580c" title="Template checklist" description="Item checklist per kategori × produk untuk task baru." meta={<Count n={tpls} />} />
        <LinkCard href="/admin/master" icon={Database} color="#059669" title="Referensi" description="Kategori, produk, prioritas, dan target SLA." />
        <LinkCard href="/admin/audit" icon={ScrollText} color="#475569" title="Audit log" description="Jejak setiap perubahan master data oleh Admin." />
      </div>
      <Alert tone="warning" title="Mode demo" action={<span data-tour="admin-reset" className="inline-block"><ResetDemoButton /></span>}>
        Data saat ini adalah data dummy ({tasks} task). Reset untuk mengembalikan semua data ke kondisi awal. Semua sesi login akan keluar.
      </Alert>
    </div>
  );
}

import { requireUser } from "@/server/auth";
import { PageHeader } from "@/components/relay/page";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["admin"]);
  return (
    <div>
      <PageHeader title="Master data" subtitle="Dikelola Admin, tanpa perlu developer." />
      <AdminNav />
      <div className="mt-5">{children}</div>
    </div>
  );
}

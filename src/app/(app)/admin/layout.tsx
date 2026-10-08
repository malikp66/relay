import { PageHeader } from "@/components/relay/page";
import { AdminNav } from "./admin-nav";

/** Pemeriksaan admin ada di tiap halaman (requireUser(["admin"])), bukan di sini, supaya layout tidak menahan kerangka loading saat pindah tab. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Master data" subtitle="Dikelola Admin, tanpa perlu developer." />
      <AdminNav />
      <div className="mt-5">{children}</div>
    </div>
  );
}

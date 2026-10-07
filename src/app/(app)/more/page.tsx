import { BarChart3, CalendarDays, ClipboardCheck, ListChecks, MapPinCheck, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import { MORE_NAV, navItem, type NavKey } from "@/lib/nav";
import { PageHeader } from "@/components/relay/page";
import { LinkCard } from "@/components/relay/link-card";
import { ThemeToggle } from "@/components/shell/theme";

export const metadata = { title: "Lainnya" };

const META: Partial<Record<NavKey, { icon: LucideIcon; color: string; description: string }>> = {
  review: { icon: ClipboardCheck, color: "#7c3aed", description: "Laporan yang menunggu keputusan." },
  attendance: { icon: MapPinCheck, color: "#2563eb", description: "Check-in tim hari ini, terlambat & di luar radius." },
  schedule: { icon: CalendarDays, color: "#0891b2", description: "Kalender kunjungan & maintenance berulang." },
  stats: { icon: BarChart3, color: "#059669", description: "Throughput, SLA, revisi, dan kepatuhan absensi." },
  templates: { icon: ListChecks, color: "#ea580c", description: "Template checklist per kategori × produk." },
  account: { icon: UserRound, color: "#475569", description: "Profil, password, dan pengaturan aplikasi." },
};

export default async function MorePage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <PageHeader title="Lainnya" />
      <div data-tour="more-list" className="grid gap-3 sm:grid-cols-2">
        {MORE_NAV[user.role].map((k) => {
          const m = META[k];
          const it = navItem(k);
          return m ? <LinkCard key={k} href={it.href} icon={m.icon} color={m.color} title={it.label} description={m.description} /> : null;
        })}
      </div>
      <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3.5 shadow-[var(--shadow-card)]">
        <div>
          <p className="text-[15px] font-medium">Tema gelap</p>
          <p className="text-xs text-muted-foreground">Nyaman untuk kerja malam</p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}

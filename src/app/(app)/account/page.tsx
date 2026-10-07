import { requireUser } from "@/server/auth";
import { Avatar } from "@/components/relay/avatar-stack";
import { PageHeader } from "@/components/relay/page";
import { ThemeToggle } from "@/components/shell/theme";
import { InstallCard } from "@/components/shell/pwa";
import { ROLE_LABEL } from "@/lib/labels";
import { AccountActions } from "./account-actions";

export const metadata = { title: "Akun" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="space-y-5">
      <PageHeader title="Akun saya" />
      <div className="flex items-center gap-4 rounded-3xl border bg-card p-5">
        <Avatar id={user.id} name={user.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">
            @{user.username} · {ROLE_LABEL[user.role]}
          </p>
          <p className="text-sm text-muted-foreground">{user.groupNames.length ? user.groupNames.join(", ") : "Semua crew"}</p>
        </div>
      </div>
      <InstallCard />
      <div className="divide-y rounded-2xl border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-medium">Tema</p>
            <p className="text-xs text-muted-foreground">Terang / gelap (berguna saat kerja malam)</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-medium">No. HP</p>
          <p className="text-sm text-muted-foreground">{user.phone ?? "-"}</p>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-medium">Versi aplikasi</p>
          <p className="text-sm text-muted-foreground">0.1.0 (demo)</p>
        </div>
      </div>
      <AccountActions />
    </div>
  );
}

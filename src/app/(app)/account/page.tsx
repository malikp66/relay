import { requireUser } from "@/server/auth";
import { Avatar } from "@/components/relay/avatar-stack";
import { PageHeader } from "@/components/relay/page";
import { ThemeToggle } from "@/components/shell/theme";
import { InstallCard } from "@/components/shell/pwa";
import { ROLE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { AccountActions } from "./account-actions";
import { NotificationSettings } from "@/components/notifications/settings";

export const metadata = { title: "Akun" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="space-y-5">
      <PageHeader title="Akun saya" />
      <section data-tour="account-profile" className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-4 p-4 sm:p-5">
          <Avatar id={user.id} name={user.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[18px] font-semibold tracking-[-0.01em]">{user.name}</p>
            <p className="truncate text-[13.5px] text-muted-foreground">{user.title ?? ROLE_LABEL[user.role]}</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border bg-foreground/[0.03] px-3 py-1 text-[12.5px] font-medium sm:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Aktif
          </span>
        </div>
        <dl className="grid grid-cols-2 border-t sm:grid-cols-4">
          {[
            { label: "Username", value: `@${user.username}`, mono: true },
            { label: "Peran", value: ROLE_LABEL[user.role] },
            { label: "Crew", value: user.groupNames.length ? user.groupNames.join(", ") : "Semua crew" },
            { label: "No. HP", value: user.phone ?? "Belum diisi", mono: !!user.phone },
          ].map((f, i) => (
            <div key={f.label} className={cn("min-w-0 px-4 py-3 sm:px-5", i % 2 === 1 && "border-l", i >= 2 && "border-t sm:border-t-0", i === 2 && "sm:border-l")}>
              <dt className="text-[12px] text-muted-foreground">{f.label}</dt>
              <dd className={cn("mt-0.5 truncate text-[14px] font-medium", f.mono && "font-mono text-[13px]")}>{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <InstallCard />
      <NotificationSettings />
      <div data-tour="account-theme" className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-medium">Tema</p>
            <p className="text-xs text-muted-foreground">Terang / gelap (berguna saat kerja malam)</p>
          </div>
          <ThemeToggle />
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

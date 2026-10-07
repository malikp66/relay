import Link from "next/link";
import { inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { requireUser } from "@/server/auth";
import { andAll, taskScope } from "@/server/policy";
import { BottomNav, SidebarNav } from "@/components/shell/nav";
import { ConnectionDot, OfflineBanner } from "@/components/shell/connection";
import { UserMenu } from "@/components/shell/user-menu";
import { ThemeIconButton } from "@/components/shell/theme";
import { TourProvider } from "@/components/tour/tour-provider";
import { BrandMark } from "@/lib/brand-icon";
import { ROLE_LABEL } from "@/lib/labels";
import { sql } from "drizzle-orm";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const db = await getDb();
  const badgeStatuses = user.role === "technician" ? (["revision"] as const) : (["submitted", "under_review"] as const);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.tasks)
    .where(andAll(taskScope(user), inArray(s.tasks.status, [...badgeStatuses])));
  const badges = user.role === "technician" ? { tasks: n } : { review: n };

  return (
    <TourProvider userId={user.id} role={user.role}>
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <OfflineBanner />
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-foreground/[0.06] bg-zinc-100/70 px-3 py-5 lg:flex dark:bg-white/[0.02]">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-3">
          <BrandMark size={30} />
          <span className="text-lg font-semibold tracking-tight">Relay</span>
        </Link>
        <SidebarNav role={user.role} badges={badges} />
        <div className="mt-auto rounded-2xl border bg-card p-3">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {ROLE_LABEL[user.role]}
            {user.groupNames.length ? ` · ${user.groupNames.join(", ")}` : " · Semua crew"}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/85 pt-safe backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 lg:px-8">
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <BrandMark size={28} />
              <span className="font-semibold tracking-tight">Relay</span>
            </Link>
            <span className="hidden text-sm text-muted-foreground lg:block">
              Masuk sebagai <span className="font-medium text-foreground">{ROLE_LABEL[user.role]}</span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <ConnectionDot />
              <ThemeIconButton />
              <UserMenu user={user} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <BottomNav role={user.role} badges={badges} />
    </div>
    </TourProvider>
  );
}

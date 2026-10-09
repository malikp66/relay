import Link from "next/link";
import { Suspense } from "react";
import { cache } from "react";
import { inArray, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { requireUser, type CurrentUser } from "@/server/auth";
import { andAll, taskScope } from "@/server/policy";
import { BottomNav, SidebarNav } from "@/components/shell/nav";
import { ConnectionDot, OfflineBanner } from "@/components/shell/connection";
import { UserMenu } from "@/components/shell/user-menu";
import { ThemeIconButton } from "@/components/shell/theme";
import { TourIdentity, TourProvider } from "@/components/tour/tour-provider";
import { NavTracker } from "@/components/relay/back-button";
import { NotificationBell } from "@/components/notifications/bell";
import { OnSiteBar } from "@/components/shell/on-site-bar";
import { InstallBanner } from "@/components/shell/pwa";
import { openAttendance } from "@/server/queries";
import { fmtTime } from "@/lib/format";
import { BrandMark } from "@/lib/brand-icon";
import { ROLE_LABEL } from "@/lib/labels";

/*
 * Layout aplikasi TIDAK menunggu data login di badannya: bagian yang butuh user (menu + badge,
 * kartu user, menu akun) masing-masing dibungkus <Suspense>. Dengan begitu loading.tsx bisa tampil
 * seketika saat pindah halaman (lihat dokumentasi layout.js "Interaction with loading.js").
 * Keamanan tetap: setiap halaman memanggil requireUser sendiri, dan /admin dijaga admin/layout.tsx.
 */

/** Jumlah badge menu (review / revisi) — sekali per request walau dipakai sidebar & bottom nav. */
const navBadges = cache(async (user: CurrentUser) => {
  const db = await getDb();
  const statuses = user.role === "technician" ? (["revision"] as const) : (["submitted", "under_review"] as const);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.tasks)
    .where(andAll(taskScope(user), inArray(s.tasks.status, [...statuses])));
  return user.role === "technician" ? { tasks: n } : { review: n };
});

async function Sidebar() {
  const user = await requireUser();
  return <SidebarNav role={user.role} badges={await navBadges(user)} />;
}
async function SidebarUser() {
  const user = await requireUser();
  return (
    <>
      <p className="truncate text-sm font-medium">{user.name}</p>
      <p className="truncate text-xs text-muted-foreground">
        {ROLE_LABEL[user.role]}
        {user.groupNames.length ? ` · ${user.groupNames.join(", ")}` : " · Semua crew"}
      </p>
    </>
  );
}
async function RoleLabel() {
  const user = await requireUser();
  return <span className="font-medium text-foreground">{ROLE_LABEL[user.role]}</span>;
}
async function HeaderUserMenu() {
  return <UserMenu user={await requireUser()} />;
}
async function MobileNav() {
  const user = await requireUser();
  return <BottomNav role={user.role} badges={await navBadges(user)} />;
}
/** Teknisi yang masih check-in → bar pengingat di bawah header (lihat on-site-bar.tsx). */
async function OnSite() {
  const user = await requireUser();
  if (user.role !== "technician") return null;
  const open = await openAttendance(user.id);
  if (!open) return null;
  return <OnSiteBar taskId={open.taskId} code={open.code} title={open.title} since={fmtTime(open.checkInAt)} checkInAt={open.checkInAt.toISOString()} />;
}
async function TourUser() {
  const user = await requireUser();
  return <TourIdentity userId={user.id} role={user.role} />;
}

const bar = "rounded-lg bg-foreground/[0.07]";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TourProvider>
      <NavTracker />
      <Suspense fallback={null}>
        <TourUser />
      </Suspense>
      <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
        <OfflineBanner />
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-foreground/[0.06] bg-zinc-100/70 px-3 py-5 lg:flex dark:bg-white/[0.02]">
          <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-3">
            <BrandMark size={30} />
            <span className="text-lg font-semibold tracking-tight">Relay</span>
          </Link>
          <Suspense
            fallback={
              <div className="space-y-1.5 px-1" aria-hidden>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`h-9 ${bar} opacity-60`} />
                ))}
              </div>
            }
          >
            <Sidebar />
          </Suspense>
          <div className="mt-auto rounded-2xl border bg-card p-3">
            <Suspense
              fallback={
                <div className="space-y-1.5" aria-hidden>
                  <div className={`h-4 w-28 ${bar}`} />
                  <div className={`h-3 w-36 ${bar} opacity-70`} />
                </div>
              }
            >
              <SidebarUser />
            </Suspense>
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
                Masuk sebagai{" "}
                <Suspense fallback={<span className={`inline-block h-3.5 w-16 align-middle ${bar}`} />}>
                  <RoleLabel />
                </Suspense>
              </span>
              <div className="ml-auto flex items-center gap-2">
                <ConnectionDot />
                <ThemeIconButton />
                <NotificationBell />
                <Suspense fallback={<span className="size-9 rounded-full bg-foreground/[0.07]" aria-hidden />}>
                  <HeaderUserMenu />
                </Suspense>
              </div>
            </div>
            <Suspense fallback={null}>
              <OnSite />
            </Suspense>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-12">
            <InstallBanner />
            {children}
          </main>
        </div>
        <Suspense fallback={<div aria-hidden className="pb-safe fixed inset-x-0 bottom-0 z-40 h-[66px] border-t border-foreground/[0.07] bg-background/85 backdrop-blur-xl lg:hidden" />}>
          <MobileNav />
        </Suspense>
      </div>
    </TourProvider>
  );
}

import Link from "next/link";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight, MapPin, Repeat } from "lucide-react";
import { requireUser } from "@/server/auth";
import { maintenancePlans, scheduledTasks } from "@/server/queries";
import { PageHeader } from "@/components/relay/page";
import { StatusBadge } from "@/components/relay/badges";
import { AvatarStack } from "@/components/relay/avatar-stack";
import { fmtDate, fmtTime } from "@/lib/format";
import { STATUS_META } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { GeneratePlanButton } from "./generate-button";

export const metadata = { title: "Jadwal" };

/*
 * Pola: mini-kalender bulan yang ringkas + agenda per minggu
 * (referensi: Notion Calendar/Cron, Cal.com, Apple Calendar "list").
 * Semua hitungan tanggal memakai string YYYY-MM-DD di zona WIB → tidak bergeser karena timezone server.
 */

const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
const toUTC = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const addDays = (s: string, n: number) => new Date(toUTC(s).getTime() + n * 864e5).toISOString().slice(0, 10);
const dowMon = (s: string) => (toUTC(s).getUTCDay() + 6) % 7; // 0 = Senin
const startOfWeek = (s: string) => addDays(s, -dowMon(s));
const wib = (s: string, time = "00:00:00") => new Date(`${s}T${time}+07:00`);
const label = (s: string, opts: Intl.DateTimeFormatOptions) => fmtDate(wib(s, "12:00:00"), opts);

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = ymd(new Date());
  const selected = typeof sp.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : today;
  const month = selected.slice(0, 7);
  const firstOfMonth = `${month}-01`;

  // Grid mini-kalender: minggu penuh (Senin–Minggu) yang mencakup seluruh bulan
  const gridStart = startOfWeek(firstOfMonth);
  const nextMonthFirst = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10);
  const gridEnd = addDays(startOfWeek(addDays(nextMonthFirst, -1)), 6);
  const gridDays: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) gridDays.push(d);

  const weekStart = startOfWeek(selected);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const rangeStart = weekStart < gridStart ? weekStart : gridStart;
  const rangeEnd = weekDays[6] > gridEnd ? weekDays[6] : gridEnd;

  const [tasks, plans] = await Promise.all([scheduledTasks(user, wib(rangeStart), wib(rangeEnd, "23:59:59")), maintenancePlans(user)]);
  const byDay = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const k = ymd(new Date(t.scheduledFor!));
    byDay.set(k, [...(byDay.get(k) ?? []), t]);
  }
  const weekCount = weekDays.reduce((n, d) => n + (byDay.get(d)?.length ?? 0), 0);

  const prevMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1)).toISOString().slice(0, 10);
  const href = (day: string) => `/schedule?day=${day}`;

  return (
    <div>
      <PageHeader title="Jadwal" subtitle="Maintenance terencana & kunjungan troubleshoot" />

      <div className="grid gap-6 lg:grid-cols-[296px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-6">
        {/* ───── Mini kalender ───── */}
        <section className="rounded-2xl border bg-card p-3 shadow-[var(--shadow-card)] lg:col-start-1 lg:row-start-1">
          <div className="mb-2 flex items-center gap-1 pl-2">
            <h2 className="flex-1 text-[15px] font-semibold tracking-[-0.01em]">{label(firstOfMonth, { month: "long", year: "numeric" })}</h2>
            {selected !== today && (
              <Link href={href(today)} scroll={false} className="press mr-1 h-7 rounded-full border px-2.5 text-xs font-medium leading-[26px] text-muted-foreground transition-colors duration-150 hover:text-foreground">
                Hari ini
              </Link>
            )}
            <NavArrow href={href(prevMonth)} label="Bulan sebelumnya" dir="left" />
            <NavArrow href={href(nextMonthFirst)} label="Bulan berikutnya" dir="right" />
          </div>
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="pb-1 text-[11px] font-medium text-muted-foreground">
                {d}
              </span>
            ))}
            {gridDays.map((d) => {
              const list = byDay.get(d) ?? [];
              const inMonth = d.startsWith(month);
              const isSel = d === selected;
              const isToday = d === today;
              const inWeek = d >= weekStart && d <= weekDays[6];
              const col = dowMon(d);
              return (
                <div key={d} className={cn("py-0.5", inWeek && "bg-foreground/[0.035]", inWeek && col === 0 && "rounded-l-[10px]", inWeek && col === 6 && "rounded-r-[10px]")}>
                  <Link
                    href={`${href(d)}#d-${d}`}
                    scroll={false}
                    aria-label={label(d, { weekday: "long", day: "numeric", month: "long" })}
                    aria-current={isSel ? "date" : undefined}
                    className={cn(
                      "press relative mx-auto flex size-9 items-center justify-center rounded-[10px] text-[13px] tabular outline-none",
                      "transition-[background-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50",
                      isSel
                        ? "bg-foreground font-semibold text-background"
                        : isToday
                          ? "font-semibold text-primary hover:bg-primary/10"
                          : inMonth
                            ? "text-foreground hover:bg-foreground/[0.06]"
                            : "text-muted-foreground/50 hover:bg-foreground/[0.04]",
                    )}
                  >
                    {Number(d.slice(8))}
                    {list.length > 0 && (
                      <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-[3px]">
                        {list.slice(0, 3).map((t) => (
                          <span key={t.id} className={cn("size-1 rounded-full", isSel ? "bg-background/80" : STATUS_META[t.status].dot)} />
                        ))}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ───── Agenda minggu ───── */}
        <section className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="mb-3 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
                {label(weekStart, { day: "numeric", month: weekStart.slice(5, 7) === weekDays[6].slice(5, 7) ? undefined : "short" })} – {label(weekDays[6], { day: "numeric", month: "short", year: "numeric" })}
              </h2>
              <p className="text-xs text-muted-foreground">{weekCount ? `${weekCount} jadwal minggu ini` : "Tidak ada jadwal minggu ini"}</p>
            </div>
            <NavArrow href={href(addDays(selected, -7))} label="Minggu sebelumnya" dir="left" bordered />
            <NavArrow href={href(addDays(selected, 7))} label="Minggu berikutnya" dir="right" bordered />
          </div>

          <ol className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
            {weekDays.map((d) => {
              const list = byDay.get(d) ?? [];
              const isSel = d === selected;
              const isToday = d === today;
              const past = d < today;
              return (
                <li key={d} id={`d-${d}`} className={cn("scroll-mt-24 border-b last:border-0", isSel && "bg-primary/[0.03]")}>
                  <div className={cn("flex gap-3 px-4", list.length ? "pb-2 pt-3" : "py-2.5")}>
                    {/* kolom tanggal */}
                    <Link href={href(d)} scroll={false} className="flex w-11 shrink-0 flex-col items-center pt-0.5 text-center">
                      <span className={cn("text-[11px] font-medium uppercase tracking-wide", isToday ? "text-primary" : "text-muted-foreground")}>{label(d, { weekday: "short" })}</span>
                      <span
                        className={cn(
                          "tabular mt-0.5 flex size-8 items-center justify-center rounded-full text-[17px] font-semibold leading-none",
                          isToday ? "bg-primary text-primary-foreground" : past ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        {Number(d.slice(8))}
                      </span>
                    </Link>

                    {/* acara */}
                    <div className="min-w-0 flex-1">
                      {list.length === 0 ? (
                        <p className={cn("pt-[18px] text-[13px] text-muted-foreground/70", past && "text-muted-foreground/50")}>Tidak ada jadwal</p>
                      ) : (
                        <ul className="space-y-1.5 pb-1">
                          {list.map((t) => (
                            <li key={t.id}>
                              <Link
                                href={`/tasks/${t.id}`}
                                style={{ "--tint": STATUS_META[t.status].tint } as CSSProperties}
                                className="group relative flex items-start gap-3 rounded-xl py-2 pl-3.5 pr-2 outline-none transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--tint)_7%,transparent)] focus-visible:ring-2 focus-visible:ring-ring/50"
                              >
                                <span aria-hidden className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-[var(--tint)]" />
                                <span className="tabular w-11 shrink-0 pt-px text-[13px] font-medium text-muted-foreground">{fmtTime(t.scheduledFor)}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[14px] font-medium leading-snug">{t.title}</span>
                                  <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                    <span className="font-mono">{t.code}</span>
                                    <span>·</span>
                                    <span>{t.productName}</span>
                                    {t.siteName && (
                                      <>
                                        <span>·</span>
                                        <MapPin className="size-3 shrink-0" />
                                        <span className="truncate">{t.siteName}</span>
                                      </>
                                    )}
                                  </span>
                                </span>
                                <span className="hidden shrink-0 items-center gap-2 sm:flex">
                                  <StatusBadge status={t.status} />
                                  <AvatarStack people={t.assignees} />
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground">
            {(["assigned", "in_progress", "job_done", "submitted", "revision", "finished"] as const).map((st) => (
              <span key={st} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", STATUS_META[st].dot)} />
                {STATUS_META[st].label}
              </span>
            ))}
          </div>
        </section>

        {/* ───── Rencana berulang ───── */}
        {(user.role !== "technician" || plans.length > 0) && (
          <section className="lg:col-start-1 lg:row-start-2">
            <h2 className="mb-2 px-1 text-[13px] font-medium text-muted-foreground">Maintenance berulang</h2>
            {plans.length ? (
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
                {plans.map(({ plan, siteName, productName, assignees }) => (
                  <li key={plan.id} className="px-3.5 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05]">
                        <Repeat className="size-3.5 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium leading-snug">{plan.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {plan.frequency === "weekly" ? "Mingguan" : "Bulanan"} · {productName} · {siteName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Berikutnya <span className="font-medium text-foreground">{fmtDate(plan.nextDate, { weekday: "short", day: "numeric", month: "short" })}</span> · {assignees.map((a) => a.name.split(" ")[0]).join(", ")}
                        </p>
                      </div>
                    </div>
                    {user.role !== "technician" && (
                      <div className="mt-2.5 pl-[38px]">
                        <GeneratePlanButton planId={plan.id} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-1 text-sm text-muted-foreground">Belum ada rencana.</p>
            )}
            {user.role !== "technician" && <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">Di production, task dari rencana dibuat otomatis beberapa hari sebelum jadwal.</p>}
          </section>
        )}
      </div>
    </div>
  );
}

function NavArrow({ href, label, dir, bordered }: { href: string; label: string; dir: "left" | "right"; bordered?: boolean }) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      title={label}
      className={cn(
        "press flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
        bordered && "border bg-card shadow-[var(--shadow-card)]",
      )}
    >
      <Icon className="size-4" strokeWidth={2.25} />
    </Link>
  );
}

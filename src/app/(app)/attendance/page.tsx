import Link from "next/link";
import { nowMs } from "@/lib/clock";
import { ArrowRight, Clock, MapPin, MapPinOff } from "lucide-react";
import type { CSSProperties } from "react";
import { requireUser } from "@/server/auth";
import { attendanceList, listTasks, myOpenAttendance, startOfDay, teamLoad } from "@/server/queries";
import { EmptyState, Metrics, PageHeader, Section } from "@/components/relay/page";
import { Avatar } from "@/components/relay/avatar-stack";
import { fmtDate, fmtDateTime, fmtDuration, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DatePicker } from "./date-picker";

export const metadata = { title: "Absensi" };

export default async function AttendancePage({ searchParams }: PageProps<"/attendance">) {
  const user = await requireUser();
  const sp = await searchParams;
  const day = typeof sp.date === "string" ? new Date(`${sp.date}T00:00:00+07:00`) : new Date();
  const from = startOfDay(day);
  const to = new Date(from.getTime() + 24 * 3600_000 - 1);

  if (user.role === "technician") {
    const [open, history, upcoming] = await Promise.all([
      myOpenAttendance(user.id),
      attendanceList(user, { from: new Date(nowMs() - 14 * 864e5), to: new Date() }),
      listTasks(user, { status: ["assigned", "in_progress"] }),
    ]);
    return (
      <div className="space-y-8">
        <PageHeader title="Absensi" subtitle="Check-in dilakukan dari halaman tugas saat tiba di lokasi." />
        {open ? (
          <Link href={`/tasks/${open.taskId}`} data-selected="true" style={{ "--tint": "#2563eb" } as CSSProperties} className="card-interactive group block rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[13px] font-medium text-primary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Sedang di lokasi
              <ArrowRight className="reveal-arrow ml-auto size-4 text-muted-foreground" />
            </div>
            <p className="tabular mt-2 text-[30px] font-semibold leading-none tracking-[-0.02em]">{fmtDuration(nowMs() - new Date(open.a.checkInAt).getTime())}</p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Check-in {fmtTime(open.a.checkInAt)} · <span className="font-mono">{open.taskCode}</span>
            </p>
            <p className="mt-0.5 truncate text-[13.5px] font-medium">{open.taskTitle}</p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-dashed border-foreground/15 p-4 sm:p-5">
            <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <MapPinOff className="size-4" /> Belum check-in
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed">Pilih tugas di bawah, lalu tahan tombol Check-in saat sudah di lokasi pelanggan.</p>
          </div>
        )}
        {upcoming.length > 0 && (
          <Section title="Siap check-in" count={upcoming.length}>
            <div className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
              {upcoming.map((t) => (
                <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-3 px-4 py-3">
                  <MapPin className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(t.scheduledFor)} · {t.siteName}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Section>
        )}
        <Section title="Riwayat 14 hari">
          {history.length ? <AttendanceRows rows={history} showUser={false} /> : <EmptyState icon={Clock} title="Belum ada riwayat" />}
        </Section>
      </div>
    );
  }

  const [rows, load] = await Promise.all([attendanceList(user, { from, to }), teamLoad(user.role === "supervisor" ? user.supervisedGroupIds : undefined)]);
  const late = rows.filter((r) => r.a.isLate).length;
  const outside = rows.filter((r) => r.a.withinGeofence === false).length;
  const onSite = load.filter((m) => m.onSite);
  const checkedUsers = new Set(rows.map((r) => r.a.userId));

  return (
    <div className="space-y-8">
      <PageHeader title="Absensi tim" subtitle={fmtDate(day, { weekday: "long", day: "numeric", month: "long" })} action={<DatePicker />} />
      <Metrics
        items={[
          { label: "Check-in", value: rows.length },
          { label: "Teknisi hadir", value: `${checkedUsers.size}/${load.length}` },
          { label: "Terlambat", value: late, tone: late ? "warning" : "default" },
          { label: "Di luar radius", value: outside, tone: outside ? "danger" : "default" },
        ]}
      />
      <Section title="Sedang di lokasi" count={onSite.length}>
        <div className="flex flex-wrap gap-2">
          {onSite.map((m) => (
            <span key={m.id} className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-[13px] font-medium shadow-[var(--shadow-card)]">
              <Avatar id={m.id} name={m.name} size="sm" /> {m.name}
            </span>
          ))}
          {!onSite.length && <p className="text-sm text-muted-foreground">Tidak ada.</p>}
        </div>
      </Section>
      <Section title="Daftar check-in">{rows.length ? <AttendanceRows rows={rows} showUser /> : <EmptyState icon={Clock} title="Belum ada check-in di tanggal ini" />}</Section>
    </div>
  );
}

function AttendanceRows({ rows, showUser }: { rows: Awaited<ReturnType<typeof attendanceList>>; showUser: boolean }) {
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      {rows.map((r) => (
        <li key={r.a.id}>
          <Link href={`/tasks/${r.taskId}`} className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-foreground/[0.025]">
            {showUser ? <Avatar id={r.a.userId} name={r.userName} /> : <MapPin className={cn("size-4", r.a.withinGeofence === false ? "text-amber-500" : "text-emerald-600")} />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{showUser ? r.userName : r.taskTitle}</p>
              <p className="truncate text-xs text-muted-foreground">
                {showUser ? `${r.taskCode} · ${r.siteName ?? ""}` : `${fmtDate(r.a.checkInAt)} · ${r.siteName ?? ""}`}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular whitespace-nowrap text-[13px] font-medium">
                {fmtTime(r.a.checkInAt)}–{r.a.checkOutAt ? fmtTime(r.a.checkOutAt) : "…"}
              </p>
              <p className="flex justify-end gap-1 text-[11px]">
                {r.a.isLate && <span className="text-amber-600">terlambat</span>}
                {r.a.withinGeofence === false && <span className="text-red-600">luar radius</span>}
                {!r.a.isLate && r.a.withinGeofence !== false && <span className="text-emerald-600">tepat</span>}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

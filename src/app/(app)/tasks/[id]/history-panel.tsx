import { Check, MapPin, RotateCcw, Settings2 } from "lucide-react";
import type { TaskStatus } from "@/db/schema";
import type { TaskDetail } from "@/server/queries";
import { Avatar } from "@/components/relay/avatar-stack";
import { Section } from "@/components/relay/page";
import { fmtDateTime, fmtTime } from "@/lib/format";
import { STATUS_META } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Kalimat aksi untuk tiap event (lebih mudah dibaca daripada deretan badge). */
function describe(type: string, from: TaskStatus | null, to: TaskStatus | null) {
  if (type === "created") return "membuat & menugaskan task";
  if (type === "check_out") return "check-out dari lokasi";
  if (type === "check_in" && !to) return "check-in di lokasi";
  switch (to) {
    case "in_progress":
      return "check-in & mulai bekerja";
    case "job_done":
      return "menandai kerja lapangan selesai";
    case "submitted":
      return "mengirim laporan";
    case "under_review":
      return from === "revision" ? "mengirim ulang laporan revisi" : "mulai mereview laporan";
    case "revision":
      return "meminta revisi";
    case "approved":
      return "menyetujui laporan";
    case "finished":
      return "menutup task";
    case "cancelled":
      return "membatalkan task";
    default:
      return type;
  }
}

export function HistoryPanel({ detail }: { detail: TaskDetail }) {
  return (
    <div className="space-y-8">
      <Section title="Review" count={detail.reviews.length}>
        {detail.reviews.length ? (
          <ol className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
            {detail.reviews.map(({ review, reviewerName }) => {
              const ok = review.decision === "approve";
              return (
                <li key={review.id} className="flex gap-3 px-4 py-3.5">
                  <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", ok ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400")}>
                    {ok ? <Check className="size-3.5" strokeWidth={2.75} /> : <RotateCcw className="size-3.5" strokeWidth={2.5} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[14px] font-medium">
                        {ok ? "Disetujui" : "Minta revisi"}
                        <span className="ml-1.5 text-[12.5px] font-normal text-muted-foreground">pass #{review.passNo}</span>
                      </p>
                      <time className="tabular shrink-0 text-[12px] text-muted-foreground">{fmtDateTime(review.reviewedAt)}</time>
                    </div>
                    {review.comments && <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/85">{review.comments}</p>}
                    <p className="mt-1 text-[12px] text-muted-foreground">oleh {reviewerName}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-0.5 text-[13px] text-muted-foreground">Belum ada review.</p>
        )}
      </Section>

      <Section title="Absensi" count={detail.attendance.length}>
        {detail.attendance.length ? (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
            {detail.attendance.map(({ a, userName }) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar id={a.userId} name={userName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{userName}</p>
                  <p className="tabular truncate text-[12.5px] text-muted-foreground">
                    {fmtDateTime(a.checkInAt)} s.d. {a.checkOutAt ? fmtTime(a.checkOutAt) : "sekarang"}
                    {a.distanceM != null ? ` · ${Math.round(a.distanceM)} m dari lokasi` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-[12px] font-medium">
                  {a.isLate && <Flag tone="amber">Terlambat</Flag>}
                  {a.withinGeofence === false && <Flag tone="amber">Luar radius</Flag>}
                  {!a.isLate && a.withinGeofence !== false && <Flag tone="emerald">Tepat</Flag>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 px-0.5 text-[13px] text-muted-foreground">
            <MapPin className="size-4" /> Belum ada check-in.
          </p>
        )}
      </Section>

      <Section title="Timeline">
        <ol className="rounded-2xl border bg-card px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
          {detail.events.map(({ event, actorName }, i) => {
            const last = i === detail.events.length - 1;
            const status = event.toStatus ? STATUS_META[event.toStatus] : null;
            return (
              <li key={event.id} className={cn("relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-3", !last && "pb-5")}>
                {/* garis penghubung: tepat di tengah kolom avatar (28px → 13.5px), dari bawah avatar ke avatar berikutnya */}
                {!last && <span aria-hidden className="absolute bottom-0.5 left-[13.5px] top-[33px] w-px bg-border" />}
                <span className="relative z-10 flex size-7 items-center justify-center">
                  {actorName ? (
                    <Avatar id={event.actorId ?? "sys"} name={actorName} className="size-7 text-[10.5px] ring-[3px] ring-card" />
                  ) : (
                    <span className="flex size-7 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground ring-[3px] ring-card">
                      <Settings2 className="size-3.5" />
                    </span>
                  )}
                </span>
                <div className="min-w-0 pt-[3px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 text-[13.5px] leading-snug">
                      <span className="font-semibold">{actorName ?? "Sistem"}</span> <span className="text-muted-foreground">{describe(event.type, event.fromStatus, event.toStatus)}</span>
                    </p>
                    <time className="tabular shrink-0 text-[12px] text-muted-foreground">{fmtDateTime(event.createdAt)}</time>
                  </div>
                  {status && (
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                      <span className={cn("size-1.5 rounded-full", status.dot)} />
                      {status.label}
                    </p>
                  )}
                  {event.note && event.note !== describe(event.type, event.fromStatus, event.toStatus) && (
                    <p className={cn("mt-1.5 text-[13px] leading-relaxed", event.toStatus === "revision" || event.toStatus === "cancelled" ? "rounded-lg bg-foreground/[0.04] px-3 py-2 text-foreground/85" : "text-muted-foreground")}>{event.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>
    </div>
  );
}

function Flag({ tone, children }: { tone: "amber" | "emerald"; children: React.ReactNode }) {
  return (
    <span className={cn("flex items-center gap-1.5", tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
      <span className={cn("size-1.5 rounded-full", tone === "amber" ? "bg-amber-500" : "bg-emerald-500")} />
      {children}
    </span>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { notify } from "@/components/relay/notify";
import {
  CalendarClock,
  ChevronRight,
  Clock3,
  CheckCheck,
  ClipboardCheck,
  Copy,
  FileText,
  Flag,
  History,
  Info,
  ListChecks,
  Lock,
  LogOut,
  MapPin,
  MapPinCheck,
  Navigation,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { Role } from "@/db/schema";
import type { TaskDetail } from "@/server/queries";
import { checkInAction, checkOutAction, transitionAction } from "@/app/actions/tasks";
import { Callout } from "@/components/relay/callout";
import { HelpButton } from "@/components/tour/help-button";
import { BackButton } from "@/components/relay/back-button";
import { HoldButton } from "@/components/relay/hold-button";
import { BottomSheet } from "@/components/relay/bottom-sheet";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { PriorityLabel, StatusBadge } from "@/components/relay/badges";
import { Avatar } from "@/components/relay/avatar-stack";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateTime, fmtTime, slaState } from "@/lib/format";
import { STATUS_META } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ChecklistPanel, isItemDone } from "./checklist-panel";
import { ReportPanel } from "./report-panel";
import { HistoryPanel } from "./history-panel";

export type Perms = {
  isAssignee: boolean;
  canManage: boolean;
  canEditChecklist: boolean;
  canEditReport: boolean;
  checkedInHere: boolean;
  openHere: boolean;
  openElsewhere: string | null;
};

export function TaskView({ detail, perms, role, initialTab }: { detail: TaskDetail; perms: Perms; role: Role; initialTab?: string }) {
  const t = detail.task;
  const defaultTab = initialTab ?? (perms.isAssignee && ["in_progress", "revision"].includes(t.status) ? "checklist" : perms.isAssignee && t.status === "job_done" ? "report" : perms.canManage && ["submitted", "under_review"].includes(t.status) ? "report" : "info");
  const [tab, setTab] = useState(defaultTab);
  const required = detail.items.filter((i) => i.required);
  const requiredDone = required.filter(isItemDone).length;
  const allDone = detail.items.filter(isItemDone).length;
  const sla = slaState(t.dueAt, t.status);
  const lastRevision = [...detail.reviews].reverse().find((r) => r.review.decision === "revision");

  return (
    <div className="pb-24">
      <div className="mb-4 flex items-center gap-2">
        <BackButton fallback="/tasks" className="-ml-0.5 mr-1" />
        <button
          className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground"
          onClick={() => {
            navigator.clipboard?.writeText(t.code);
            notify.success("Kode task disalin");
          }}
        >
          {t.code} <Copy className="size-3.5" />
        </button>
        <span className="ml-auto flex items-center gap-2">
          <HelpButton />
          <StatusBadge status={t.status} />
        </span>
      </div>

      <h1 className="text-xl font-semibold leading-snug tracking-tight md:text-2xl">{t.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>{detail.category.name}</span>
        <span>·</span>
        <span>{detail.productName}</span>
        <span>·</span>
        <PriorityLabel level={detail.priority.level} name={detail.priority.name} />
        {sla && (
          <span
            className={cn(
              "tabular rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none",
              sla.level === "overdue" ? "bg-red-500/10 text-red-600 dark:text-red-400" : sla.level === "soon" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-foreground/[0.05] text-muted-foreground",
            )}
          >
            {sla.label}
          </span>
        )}
      </div>

      <StatusStepper status={t.status} revisionCount={t.revisionCount} />

      {(t.status === "revision" && lastRevision) || ["finished", "cancelled"].includes(t.status) || (perms.isAssignee && t.status === "in_progress" && !perms.checkedInHere) ? (
        <div className="mt-5 space-y-2">
          {t.status === "revision" && lastRevision && (
            <Callout tone="danger" icon={RotateCcw} title={`Revisi ke-${t.revisionCount} dari ${lastRevision.reviewerName}`}>
              {lastRevision.review.comments}
            </Callout>
          )}
          {t.status === "finished" && (
            <Callout icon={Lock} title={`Selesai ${fmtDateTime(t.finishedAt)}`}>
              Checklist, laporan, dan riwayat review terkunci (read-only).
            </Callout>
          )}
          {t.status === "cancelled" && (
            <Callout icon={XCircle} title="Dibatalkan">
              {t.cancelReason}
            </Callout>
          )}
          {perms.isAssignee && t.status === "in_progress" && !perms.checkedInHere && (
            <Callout tone="warning" icon={MapPinCheck} title="Check-in dulu">
              Rekan setim sudah memulai task ini. Check-in untuk ikut mengisi checklist.
            </Callout>
          )}
        </div>
      ) : null}

      <div data-tour="task-detail-tabs" className="sticky top-14 z-20 -mx-4 mt-5 bg-background/90 px-4 py-2 backdrop-blur-xl lg:-mx-8 lg:px-8">
        <SmoothTabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "info", label: "Info", icon: Info },
            { id: "checklist", label: "Checklist", icon: ListChecks, badge: detail.items.length ? `${allDone}/${detail.items.length}` : undefined },
            { id: "report", label: "Laporan", icon: FileText },
            { id: "history", label: "Riwayat", icon: History },
          ]}
        />
      </div>

      <div className="mt-4">
        {tab === "info" && <InfoPanel detail={detail} requiredDone={requiredDone} requiredTotal={required.length} onOpenChecklist={() => setTab("checklist")} />}
        {tab === "checklist" && <ChecklistPanel items={detail.items} editable={perms.canEditChecklist} />}
        {tab === "report" && <ReportPanel detail={detail} editable={perms.canEditReport} />}
        {tab === "history" && <HistoryPanel detail={detail} />}
      </div>

      <ActionBar detail={detail} perms={perms} role={role} missing={required.filter((i) => !isItemDone(i)).map((i) => i.label)} goTab={setTab} />
    </div>
  );
}

/* ───────────── Stepper status ───────────── */

const FLOW = ["assigned", "in_progress", "job_done", "submitted", "under_review", "finished"] as const;

function StatusStepper({ status, revisionCount }: { status: string; revisionCount: number }) {
  if (status === "cancelled") return null;
  const idx = status === "revision" ? 4 : status === "approved" ? 5 : FLOW.indexOf(status as (typeof FLOW)[number]);
  return (
    <div data-tour="task-stepper" className="mt-4 flex items-center gap-1">
      {FLOW.map((st, i) => (
        <div key={st} className="flex flex-1 flex-col gap-1.5">
          <div className={cn("h-1.5 rounded-full", i < idx ? "bg-primary" : i === idx ? (status === "revision" ? "bg-red-500" : "bg-primary") : "bg-muted")} />
          <span className={cn("hidden truncate text-[10px] sm:block", i === idx ? "font-semibold text-foreground" : "text-muted-foreground")}>
            {i === 4 && status === "revision" ? `Revision${revisionCount ? ` #${revisionCount}` : ""}` : STATUS_META[st].label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ───────────── Info ───────────── */

function InfoPanel({ detail, requiredDone, requiredTotal, onOpenChecklist }: { detail: TaskDetail; requiredDone: number; requiredTotal: number; onOpenChecklist: () => void }) {
  const t = detail.task;
  const mapsUrl = detail.site ? `https://www.google.com/maps/dir/?api=1&destination=${detail.site.lat},${detail.site.lng}` : null;
  const complete = requiredDone === requiredTotal;
  const overdue = slaState(t.dueAt, t.status)?.level === "overdue";
  return (
    <div className="space-y-3">
      {detail.site && (
        <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05]">
              <MapPin className="size-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold tracking-[-0.01em]">{detail.customer?.name ?? detail.site.name}</p>
              <p className="text-[13.5px] leading-snug text-muted-foreground">{detail.site.address}</p>
              {detail.customer && (
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  <span className="font-mono text-[12px]">{detail.customer.customerNo}</span> · {detail.customer.service}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3.5 flex gap-2">
            {mapsUrl && (
              <Button asChild variant="outline" className="h-10 flex-1 rounded-xl bg-card">
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                  <Navigation className="size-4" /> Navigasi
                </a>
              </Button>
            )}
            {detail.customer?.phone && (
              <Button asChild variant="outline" className="h-10 flex-1 rounded-xl bg-card">
                <a href={`tel:${detail.customer.phone.replace(/[^0-9+]/g, "")}`}>
                  <Phone className="size-4" /> Telepon
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Detail + progres checklist dalam satu kartu */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
        <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
          <Field label="Jadwal" value={fmtDateTime(t.scheduledFor)} icon={CalendarClock} />
          <Field label="Deadline (SLA)" value={fmtDateTime(t.dueAt)} icon={Flag} tone={overdue ? "danger" : undefined} />
          <Field label="Crew" value={detail.groupName} />
          <Field label="Dibuat oleh" value={detail.creatorName} />
          <Field label="Mulai" value={t.startedAt ? fmtDateTime(t.startedAt) : "Belum"} muted={!t.startedAt} />
          <Field label="Job done" value={t.jobDoneAt ? fmtDateTime(t.jobDoneAt) : "Belum"} muted={!t.jobDoneAt} />
        </dl>
        <button type="button" onClick={onOpenChecklist} className="group flex w-full items-center gap-3 border-t px-4 py-3 text-left outline-none transition-colors duration-150 hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.04] sm:px-5">
          <ListChecks className="size-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 text-[13px] font-medium">Item wajib</span>
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-foreground/[0.07]">
            <span className={cn("block h-full origin-left rounded-full transition-transform duration-500 ease-[var(--ease-out)]", complete ? "bg-emerald-500" : "bg-amber-500")} style={{ transform: `scaleX(${requiredTotal ? requiredDone / requiredTotal : 0})` }} />
          </span>
          <span className="tabular shrink-0 text-[13px] font-semibold">
            {requiredDone}/{requiredTotal}
          </span>
          <span className={cn("hidden shrink-0 text-[12.5px] font-medium sm:inline", complete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
            {complete ? "Lengkap" : `${requiredTotal - requiredDone} tersisa`}
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
        </button>
      </div>

      <div className="rounded-2xl border bg-card shadow-[var(--shadow-card)]">
        <p className="px-4 pb-1 pt-3.5 text-[13px] font-medium text-muted-foreground sm:px-5">Teknisi ditugaskan</p>
        <ul className="divide-y">
          {detail.assignees.map((a) => {
            const att = detail.attendance.filter((x) => x.a.userId === a.id).at(-1);
            const onSite = att && !att.a.checkOutAt;
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar id={a.id} name={a.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{a.name}</p>
                  <p className="tabular text-[12.5px] text-muted-foreground">
                    {att ? (att.a.checkOutAt ? `Check-in ${fmtTime(att.a.checkInAt)} s.d. ${fmtTime(att.a.checkOutAt)}` : `Di lokasi sejak ${fmtTime(att.a.checkInAt)}`) : "Belum check-in"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-[12px] font-medium">
                  {onSite && (
                    <span className="flex items-center gap-1.5 text-primary">
                      <span className="size-1.5 rounded-full bg-primary" /> Di lokasi
                    </span>
                  )}
                  {att?.a.isLate && <span className="text-amber-600 dark:text-amber-400">Terlambat</span>}
                  {att?.a.withinGeofence === false && <span className="text-amber-600 dark:text-amber-400">Luar radius</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {t.description && (
        <div className="rounded-2xl border bg-card px-4 py-3.5 shadow-[var(--shadow-card)] sm:px-5">
          <p className="text-[13px] font-medium text-muted-foreground">Deskripsi</p>
          <p className="mt-1 text-[14px] leading-relaxed">{t.description}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, icon: Icon, tone, muted }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; tone?: "danger"; muted?: boolean }) {
  return (
    <div className="bg-card px-4 py-3 sm:px-5 sm:py-3.5">
      <dt className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd className={cn("tabular mt-1 text-[14.5px] font-semibold tracking-[-0.01em]", tone === "danger" && "text-red-600 dark:text-red-400", muted && "font-normal text-muted-foreground")}>{value}</dd>
    </div>
  );
}

/* ───────────── Action bar ───────────── */

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  });
}

function ActionBar({ detail, perms, missing, goTab }: { detail: TaskDetail; perms: Perms; role: Role; missing: string[]; goTab: (t: string) => void }) {
  const router = useRouter();
  const t = detail.task;
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState<null | "missing" | "revision" | "cancel" | "geo">(null);
  const [comment, setComment] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        notify.success(success);
        after?.();
        router.refresh();
      } else notify.error(res.error);
    });

  async function doCheckIn(pos?: { lat: number; lng: number; accuracy?: number }) {
    let p = pos;
    if (!p) {
      try {
        const g = await getPosition();
        p = { lat: g.coords.latitude, lng: g.coords.longitude, accuracy: g.coords.accuracy };
      } catch {
        setSheet("geo");
        return;
      }
    }
    const res = await checkInAction(t.id, p);
    if (res.ok) {
      notify.success(res.within === false ? `Check-in tercatat, tapi ${res.distance} m dari lokasi (di luar radius).` : "Check-in berhasil. Selamat bekerja!");
      setSheet(null);
      goTab("checklist");
      router.refresh();
    } else notify.error(res.error);
  }

  let content: React.ReactNode = null;

  if (perms.isAssignee) {
    const canCheckIn = ["assigned", "in_progress", "revision"].includes(t.status) && !perms.openHere && (t.status !== "revision" ? !perms.checkedInHere : true);
    if (canCheckIn && perms.openElsewhere) {
      content = <Hint>Kamu masih check-in di {perms.openElsewhere}. Check-out dulu dari task itu.</Hint>;
    } else if (t.status === "assigned" || (t.status === "in_progress" && !perms.checkedInHere)) {
      content = <HoldButton label="Tahan untuk Check-in" icon={MapPinCheck} loading={pending} onComplete={() => start(() => doCheckIn())} />;
    } else if (t.status === "in_progress") {
      content = (
        <div className="flex gap-2">
          {perms.openHere && (
            <Button variant="outline" className="h-14 shrink-0 flex-col gap-0.5 rounded-2xl bg-card px-3.5 text-[11px] font-medium shadow-[var(--shadow-card)]" disabled={pending} onClick={() => run(() => checkOutAction(t.id), "Check-out berhasil")}>
              <LogOut className="size-[18px]" />
              Check-out
            </Button>
          )}
          {missing.length ? (
            <Button className="h-14 flex-1 rounded-2xl bg-secondary text-secondary-foreground hover:bg-secondary" onClick={() => setSheet("missing")}>
              <ListChecks className="size-5" /> {missing.length} item wajib belum lengkap
            </Button>
          ) : (
            <HoldButton label="Tahan: Selesai Kerja (Job Done)" icon={CheckCheck} tone="warning" loading={pending} onComplete={() => run(() => transitionAction(t.id, "job_done"), "Job Done! Sekarang tulis laporannya.", () => goTab("report"))} />
          )}
        </div>
      );
    } else if (t.status === "job_done") {
      content = <HoldButton label="Tahan: Kirim Laporan" icon={Send} loading={pending} onComplete={() => run(() => transitionAction(t.id, "submit"), "Laporan terkirim ke supervisor")} />;
    } else if (t.status === "revision") {
      content = <HoldButton label="Tahan: Kirim Ulang Laporan" icon={Send} tone="danger" loading={pending} onComplete={() => run(() => transitionAction(t.id, "resubmit"), "Revisi terkirim, menunggu review ulang")} />;
    } else if (["submitted", "under_review"].includes(t.status)) {
      content = <Hint>{t.status === "submitted" ? "Laporan terkirim. Menunggu supervisor memulai review." : "Supervisor sedang mereview laporanmu."}</Hint>;
    }
  } else if (perms.canManage) {
    if (t.status === "submitted") {
      content = (
        <Button className="h-14 w-full rounded-2xl text-[15px]" disabled={pending} onClick={() => run(() => transitionAction(t.id, "start_review"), "Review dimulai", () => goTab("report"))}>
          <ClipboardCheck className="size-5" /> Mulai Review
        </Button>
      );
    } else if (t.status === "under_review") {
      content = (
        <div className="flex gap-2">
          <Button variant="outline" className="h-14 flex-1 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900" onClick={() => setSheet("revision")}>
            <RotateCcw className="size-4" /> Revisi
          </Button>
          <HoldButton className="flex-[1.6]" label="Tahan: Approve" icon={ShieldCheck} tone="success" loading={pending} onComplete={() => run(() => transitionAction(t.id, "approve"), "Laporan disetujui. Task ditutup (Finished).")} />
        </div>
      );
    } else if (["assigned", "in_progress"].includes(t.status)) {
      content = (
        <Button variant="outline" className="h-12 w-full rounded-2xl text-red-600" onClick={() => setSheet("cancel")}>
          <XCircle className="size-4" /> Batalkan task
        </Button>
      );
    } else if (t.status === "revision") {
      content = <Hint>Menunggu teknisi memperbaiki & mengirim ulang laporan.</Hint>;
    } else if (t.status === "job_done") {
      content = <Hint>Kerja lapangan selesai. Menunggu teknisi mengirim laporan.</Hint>;
    }
  }

  return (
    <>
      {content && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-foreground/[0.06] bg-background/85 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 lg:bottom-0 lg:left-[248px]">
          <div data-tour="task-actions" className="mx-auto max-w-3xl">{content}</div>
        </div>
      )}

      <BottomSheet open={sheet === "missing"} onOpenChange={(o) => !o && setSheet(null)} title="Item wajib belum lengkap" description="Lengkapi item berikut sebelum menandai Job Done.">
        <ul className="space-y-2 pb-2">
          {missing.map((m) => (
            <li key={m} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm">
              <span className="size-1.5 rounded-full bg-red-500" /> {m}
            </li>
          ))}
        </ul>
        <Button
          className="mt-3 h-12 w-full rounded-xl"
          onClick={() => {
            setSheet(null);
            goTab("checklist");
          }}
        >
          Buka checklist
        </Button>
      </BottomSheet>

      <BottomSheet open={sheet === "revision"} onOpenChange={(o) => !o && setSheet(null)} title="Minta revisi" description="Task akan kembali ke teknisi. Tulis apa yang perlu diperbaiki.">
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="mis. Foto hasil splice kurang jelas, mohon foto ulang lebih dekat." className="rounded-xl" />
        <div className="mt-2 flex flex-wrap gap-2">
          {["Foto kurang jelas", "Nilai pengukuran belum diisi", "Tindakan kurang detail"].map((q) => (
            <button key={q} type="button" onClick={() => setComment((c) => (c ? `${c} ${q}.` : `${q}.`))} className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted">
              + {q}
            </button>
          ))}
        </div>
        <Button className="mt-4 h-12 w-full rounded-xl bg-red-600 hover:bg-red-700" disabled={pending || !comment.trim()} onClick={() => run(() => transitionAction(t.id, "request_revision", comment), "Revisi dikirim ke teknisi", () => { setSheet(null); setComment(""); })}>
          Kirim permintaan revisi
        </Button>
      </BottomSheet>

      <BottomSheet open={sheet === "cancel"} onOpenChange={(o) => !o && setSheet(null)} title="Batalkan task" description="Alasan pembatalan wajib diisi dan tercatat di riwayat.">
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="mis. Pelanggan membatalkan komplain." className="rounded-xl" />
        <Button className="mt-4 h-12 w-full rounded-xl" variant="destructive" disabled={pending || !comment.trim()} onClick={() => run(() => transitionAction(t.id, "cancel", comment), "Task dibatalkan", () => { setSheet(null); setComment(""); })}>
          Batalkan task
        </Button>
      </BottomSheet>

      <BottomSheet open={sheet === "geo"} onOpenChange={(o) => !o && setSheet(null)} title="Lokasi tidak terdeteksi" description="Izinkan akses lokasi di browser, lalu coba lagi. Untuk demo di laptop, gunakan simulasi lokasi.">
        <div className="space-y-2 pb-2">
          <Button className="h-12 w-full rounded-xl" variant="outline" disabled={pending} onClick={() => start(() => doCheckIn())}>
            Coba lagi
          </Button>
          {detail.site && (
            <Button className="h-12 w-full rounded-xl" disabled={pending} onClick={() => start(() => doCheckIn({ lat: detail.site!.lat + 0.0003, lng: detail.site!.lng + 0.0002, accuracy: 12 }))}>
              <MapPin className="size-4" /> Simulasikan: saya di lokasi (demo)
            </Button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 py-2 text-center text-[13.5px] text-muted-foreground">
      <Clock3 className="size-4 shrink-0" />
      {children}
    </p>
  );
}

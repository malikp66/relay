"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { notify } from "@/components/relay/notify";
import {
  ArrowLeft,
  CalendarClock,
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
import { HoldButton } from "@/components/relay/hold-button";
import { BottomSheet } from "@/components/relay/bottom-sheet";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { PriorityLabel, StatusBadge } from "@/components/relay/badges";
import { Avatar } from "@/components/relay/avatar-stack";
import { ProgressRing } from "@/components/relay/progress-ring";
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
        <Link href="/tasks" className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-muted" aria-label="Kembali">
          <ArrowLeft className="size-5" />
        </Link>
        <button
          className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground"
          onClick={() => {
            navigator.clipboard?.writeText(t.code);
            notify.success("Kode task disalin");
          }}
        >
          {t.code} <Copy className="size-3.5" />
        </button>
        <span className="ml-auto">
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
        {sla && <span className={cn("font-medium", sla.level === "overdue" ? "text-red-600" : sla.level === "soon" ? "text-amber-600" : "")}>· {sla.label}</span>}
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

      <div className="sticky top-14 z-20 -mx-4 mt-5 bg-background/90 px-4 py-2 backdrop-blur-xl lg:-mx-8 lg:px-8">
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
        {tab === "info" && <InfoPanel detail={detail} requiredDone={requiredDone} requiredTotal={required.length} />}
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
    <div className="mt-4 flex items-center gap-1">
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

function InfoPanel({ detail, requiredDone, requiredTotal }: { detail: TaskDetail; requiredDone: number; requiredTotal: number }) {
  const t = detail.task;
  const mapsUrl = detail.site ? `https://www.google.com/maps/dir/?api=1&destination=${detail.site.lat},${detail.site.lng}` : null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {detail.site && (
        <div className="rounded-2xl border bg-card p-4 md:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <MapPin className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{detail.customer?.name ?? detail.site.name}</p>
              <p className="text-sm text-muted-foreground">{detail.site.address}</p>
              {detail.customer && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {detail.customer.customerNo} · {detail.customer.service}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {mapsUrl && (
              <Button asChild variant="outline" className="h-10 flex-1 rounded-xl">
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                  <Navigation className="size-4" /> Navigasi
                </a>
              </Button>
            )}
            {detail.customer?.phone && (
              <Button asChild variant="outline" className="h-10 flex-1 rounded-xl">
                <a href={`tel:${detail.customer.phone.replace(/[^0-9+]/g, "")}`}>
                  <Phone className="size-4" /> Telepon
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
          <Field label="Jadwal" value={fmtDateTime(t.scheduledFor)} icon={CalendarClock} />
          <Field label="Deadline (SLA)" value={fmtDateTime(t.dueAt)} icon={Flag} />
          <Field label="Crew" value={detail.groupName} />
          <Field label="Dibuat oleh" value={detail.creatorName} />
          <Field label="Mulai" value={t.startedAt ? fmtDateTime(t.startedAt) : "-"} />
          <Field label="Job done" value={t.jobDoneAt ? fmtDateTime(t.jobDoneAt) : "-"} />
        </dl>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
        <ProgressRing value={requiredDone} max={requiredTotal} size={68} />
        <div className="text-sm">
          <p className="font-medium">Item wajib checklist</p>
          <p className="text-muted-foreground">{requiredDone === requiredTotal ? "Semua item wajib terpenuhi." : `${requiredTotal - requiredDone} item wajib belum terpenuhi.`}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 md:col-span-2">
        <p className="mb-3 text-sm font-medium">Teknisi ditugaskan</p>
        <ul className="space-y-2.5">
          {detail.assignees.map((a) => {
            const att = detail.attendance.filter((x) => x.a.userId === a.id).at(-1);
            return (
              <li key={a.id} className="flex items-center gap-3">
                <Avatar id={a.id} name={a.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {att ? (att.a.checkOutAt ? `Check-in ${fmtTime(att.a.checkInAt)} – ${fmtTime(att.a.checkOutAt)}` : `Di lokasi sejak ${fmtTime(att.a.checkInAt)}`) : "Belum check-in"}
                    {att?.a.isLate ? " · terlambat" : ""}
                    {att?.a.withinGeofence === false ? " · di luar radius" : ""}
                  </p>
                </div>
                {att && !att.a.checkOutAt && <span className="size-2.5 rounded-full bg-blue-500" />}
              </li>
            );
          })}
        </ul>
      </div>

      {t.description && (
        <div className="rounded-2xl border bg-card p-4 md:col-span-2">
          <p className="mb-1 text-sm font-medium">Deskripsi</p>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
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
            <Button variant="outline" className="h-14 rounded-2xl px-4" disabled={pending} onClick={() => run(() => checkOutAction(t.id), "Check-out berhasil")}>
              <LogOut className="size-4" />
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
          <div className="mx-auto max-w-3xl">{content}</div>
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

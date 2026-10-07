"use client";

import { Check, CloudUpload, FileText, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { saveReportAction } from "@/app/actions/tasks";
import type { ReportField } from "@/db/schema";
import type { TaskDetail } from "@/server/queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Values = Record<string, string | number | boolean | null>;

export function ReportPanel({ detail, editable }: { detail: TaskDetail; editable: boolean }) {
  const fields: ReportField[] = detail.template?.fields ?? [];
  const report = detail.report;
  const [values, setValues] = useState<Values>(report?.fields ?? {});
  const [findings, setFindings] = useState(report?.findings ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  // Autosave (debounce) — laporan bersama, siapa pun assignee bisa mengedit
  function scheduleSave(nextValues: Values, nextFindings: string) {
    if (!editable) return;
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await saveReportAction(detail.task.id, nextValues, nextFindings);
      if (res.ok) {
        setState("saved");
        setError(null);
      } else {
        setState("error");
        setError(res.error);
      }
    }, 900);
  }

  const notStarted = !report && !editable;
  if (notStarted || ["assigned", "in_progress"].includes(detail.task.status)) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <FileText className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 font-medium">Laporan belum dibuat</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Laporan bisa ditulis setelah task berstatus Job Done (semua item wajib checklist terpenuhi).</p>
      </div>
    );
  }

  const set = (k: string, v: string | number | boolean | null) => {
    const next = { ...values, [k]: v };
    setValues(next);
    scheduleSave(next, findings);
  };
  const evidence = detail.items.filter((i) => i.response && (i.type !== "tick" || i.response.checked));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {detail.template?.name ?? "Laporan"}
          {report?.submittedAt ? ` · dikirim ${fmtDateTime(report.submittedAt)}` : " · draft"}
        </span>
        {editable && (
          <span className={cn("flex items-center gap-1", state === "error" && "text-red-600")}>
            {state === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : state === "saved" ? <Check className="size-3.5 text-emerald-600" /> : <CloudUpload className="size-3.5" />}
            {state === "saving" ? "Menyimpan…" : state === "saved" ? "Tersimpan" : state === "error" ? "Gagal simpan" : detail.reportEditorName ? `Terakhir diedit ${detail.reportEditorName}` : "Tersimpan otomatis"}
          </span>
        )}
      </div>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {editable ? (
        <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[13.5px]">
                {f.label}
                {f.required ? <span className="rounded bg-amber-500/10 px-1 text-[10.5px] font-medium text-amber-700 dark:text-amber-400">Wajib</span> : null}
              </Label>
              <FieldInput field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[13.5px]">
              Temuan / catatan akhir
              <span className="rounded bg-amber-500/10 px-1 text-[10.5px] font-medium text-amber-700 dark:text-amber-400">Wajib</span>
            </Label>
            <Textarea
              value={findings}
              onChange={(e) => {
                setFindings(e.target.value);
                scheduleSave(values, e.target.value);
              }}
              rows={3}
              className="rounded-xl text-base"
              placeholder="Ringkasan hasil pekerjaan dan hal yang perlu diperhatikan."
            />
          </div>
        </div>
      ) : (
        /* Mode lihat: daftar definisi — label kecil, isi tegas, garis pemisah */
        <dl className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
          {[...fields.map((f) => ({ key: f.key, label: f.label, value: formatValue(values[f.key]) })), { key: "__findings", label: "Temuan / catatan akhir", value: findings || "Belum diisi" }].map((row) => (
            <div key={row.key} className="grid gap-1 px-4 py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-[12.5px] font-medium text-muted-foreground sm:pt-px">{row.label}</dt>
              <dd className={cn("whitespace-pre-wrap text-[14px] leading-relaxed", row.value === "Belum diisi" ? "text-muted-foreground" : "text-foreground")}>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="mb-3 text-[13px] font-medium text-muted-foreground">Bukti checklist</p>
        <div className="space-y-2">
          {evidence.map((i) => (
            <div key={i.id} className="flex items-start gap-3 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p>{i.label}</p>
                {i.type === "data" && <p className="tabular font-semibold">{`${i.response?.value} ${i.unit ?? ""}`}</p>}
                {i.type === "photo" && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {i.response?.photos.map((p) => (
                      <a key={p} href={p} target="_blank" rel="noreferrer" className="block size-16 overflow-hidden rounded-lg border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt={i.label} className="size-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {!evidence.length && <p className="text-sm text-muted-foreground">Belum ada bukti.</p>}
        </div>
      </div>
    </div>
  );
}

function formatValue(v: unknown) {
  if (v === true) return "Ya";
  if (v === false) return "Tidak";
  if (v === null || v === undefined || v === "") return "Belum diisi";
  return String(v);
}

function FieldInput({ field, value, onChange }: { field: ReportField; value: Values[string] | undefined; onChange: (v: string | number | boolean | null) => void }) {
  switch (field.type) {
    case "textarea":
      return <Textarea value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} className="rounded-xl text-base" placeholder={field.placeholder} />;
    case "number":
      return <Input inputMode="decimal" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="h-12 rounded-xl" />;
    case "boolean":
      return (
        <div className="flex items-center gap-3">
          <Switch checked={!!value} onCheckedChange={(c) => onChange(c)} />
          <span className="text-sm text-muted-foreground">{value ? "Ya" : "Tidak"}</span>
        </div>
      );
    case "select":
      return (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              aria-pressed={value === o}
              className="chip h-10 rounded-xl"
            >
              {o}
            </button>
          ))}
        </div>
      );
    default:
      return <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="h-12 rounded-xl" placeholder={field.placeholder} />;
  }
}

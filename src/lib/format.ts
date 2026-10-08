const TZ = "Asia/Jakarta";

export function fmtDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, ...opts }).format(new Date(d));
}
export const fmtTime = (d: Date | string | null | undefined) => fmtDate(d, { hour: "2-digit", minute: "2-digit" });
export const fmtDateTime = (d: Date | string | null | undefined) => fmtDate(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const fmtLongDate = (d: Date | string | null | undefined) => fmtDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function fmtDuration(ms: number) {
  const abs = Math.abs(ms);
  const m = Math.round(abs / 60000);
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} j${m % 60 ? ` ${m % 60} m` : ""}`;
  const d = Math.floor(h / 24);
  return `${d} h${h % 24 ? ` ${h % 24} j` : ""}`;
}

export function relative(d: Date | string | null | undefined) {
  if (!d) return "-";
  const diff = new Date(d).getTime() - Date.now();
  const s = fmtDuration(diff);
  return diff >= 0 ? `${s} lagi` : `${s} lalu`;
}

/** Sisa waktu SLA → teks & tingkat. */
export function slaState(dueAt: Date | string, status: string) {
  if (["job_done", "submitted", "under_review", "revision", "approved", "finished", "cancelled"].includes(status)) return null;
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff < 0) return { label: `Lewat ${fmtDuration(diff)}`, level: "overdue" as const };
  if (diff < 4 * 3600_000) return { label: `Sisa ${fmtDuration(diff)}`, level: "soon" as const };
  return { label: `Sisa ${fmtDuration(diff)}`, level: "ok" as const };
}

/** Jam → teks yang mudah dibaca: 4 → "4 jam", 72 → "3 hari", 30 → "1 hari 6 jam". */
export const humanizeHours = (h: number) => (h >= 24 && h % 24 === 0 ? `${h / 24} hari` : h > 24 ? `${Math.floor(h / 24)} hari ${h % 24} jam` : `${h} jam`);

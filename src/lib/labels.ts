import type { ChecklistType, Role, TaskStatus } from "@/db/schema";

export const STATUS_ORDER: TaskStatus[] = [
  "assigned",
  "in_progress",
  "job_done",
  "submitted",
  "under_review",
  "revision",
  "approved",
  "finished",
];

/** Nama status mengikuti PRD (istilah domain), deskripsi dalam Bahasa Indonesia. */
export const STATUS_META: Record<TaskStatus, { label: string; hint: string; chip: string; dot: string; tint: string }> = {
  assigned: { label: "Assigned", hint: "Belum dimulai", chip: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", dot: "bg-zinc-400", tint: "#71717a" },
  in_progress: { label: "In Progress", hint: "Sedang dikerjakan di lokasi", chip: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300", dot: "bg-blue-500", tint: "#3b82f6" },
  job_done: { label: "Job Done", hint: "Kerja lapangan selesai, laporan belum dikirim", chip: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300", dot: "bg-amber-500", tint: "#f59e0b" },
  submitted: { label: "Submitted", hint: "Laporan menunggu review", chip: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300", dot: "bg-indigo-500", tint: "#6366f1" },
  under_review: { label: "Under Review", hint: "Sedang direview supervisor", chip: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300", dot: "bg-violet-500", tint: "#8b5cf6" },
  revision: { label: "Revision", hint: "Perlu diperbaiki teknisi", chip: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300", dot: "bg-red-500", tint: "#ef4444" },
  approved: { label: "Approved", hint: "Laporan disetujui", chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", dot: "bg-emerald-500", tint: "#10b981" },
  finished: { label: "Finished", hint: "Task ditutup & terkunci", chip: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", dot: "bg-slate-500", tint: "#64748b" },
  cancelled: { label: "Cancelled", hint: "Dibatalkan", chip: "bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-900 dark:text-zinc-500", dot: "bg-zinc-300", tint: "#a1a1aa" },
};

export const PRIORITY_META: Record<number, { dot: string; text: string }> = {
  1: { dot: "bg-zinc-400", text: "text-zinc-500" },
  2: { dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" },
  3: { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  4: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  technician: "Teknisi",
};

export const CHECKLIST_TYPE_LABEL: Record<ChecklistType, string> = {
  tick: "Centang",
  data: "Isi data",
  photo: "Foto",
};

export const ACTIVE_STATUSES: TaskStatus[] = ["assigned", "in_progress", "job_done", "submitted", "under_review", "revision", "approved"];
export const CLOSED_STATUSES: TaskStatus[] = ["finished", "cancelled"];

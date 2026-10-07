import type { Role } from "@/db/schema";

export type NavKey = "dashboard" | "tasks" | "review" | "attendance" | "schedule" | "stats" | "templates" | "admin" | "account" | "more";

export type NavItem = { key: NavKey; href: string; label: string };

const ALL: Record<NavKey, NavItem> = {
  dashboard: { key: "dashboard", href: "/dashboard", label: "Beranda" },
  tasks: { key: "tasks", href: "/tasks", label: "Tugas" },
  review: { key: "review", href: "/review", label: "Review" },
  attendance: { key: "attendance", href: "/attendance", label: "Absensi" },
  schedule: { key: "schedule", href: "/schedule", label: "Jadwal" },
  stats: { key: "stats", href: "/stats", label: "Statistik" },
  templates: { key: "templates", href: "/templates", label: "Template" },
  admin: { key: "admin", href: "/admin", label: "Master Data" },
  account: { key: "account", href: "/account", label: "Akun" },
  more: { key: "more", href: "/more", label: "Lainnya" },
};

/** Bottom nav mobile (maks 5) per role — RENCANA §4B. */
export const BOTTOM_NAV: Record<Role, NavKey[]> = {
  technician: ["dashboard", "tasks", "attendance", "schedule", "account"],
  supervisor: ["dashboard", "tasks", "review", "schedule", "more"],
  admin: ["dashboard", "tasks", "stats", "admin", "more"],
};

/** Sidebar desktop. */
export const SIDEBAR_NAV: Record<Role, NavKey[]> = {
  technician: ["dashboard", "tasks", "attendance", "schedule", "account"],
  supervisor: ["dashboard", "tasks", "review", "attendance", "schedule", "stats", "templates", "account"],
  admin: ["dashboard", "tasks", "review", "attendance", "schedule", "stats", "templates", "admin", "account"],
};

/** Isi halaman "Lainnya" di mobile. */
export const MORE_NAV: Record<Role, NavKey[]> = {
  technician: [],
  supervisor: ["attendance", "stats", "templates", "account"],
  admin: ["review", "attendance", "schedule", "templates", "account"],
};

export const navItem = (k: NavKey) => ALL[k];

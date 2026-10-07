import { BarChart3, CalendarDays, ClipboardCheck, ClipboardList, Database, Home, LayoutGrid, ListChecks, MapPinCheck, UserRound, type LucideIcon } from "lucide-react";
import type { NavKey } from "@/lib/nav";

export const NAV_ICONS: Record<NavKey, LucideIcon> = {
  dashboard: Home,
  tasks: ClipboardList,
  review: ClipboardCheck,
  attendance: MapPinCheck,
  schedule: CalendarDays,
  stats: BarChart3,
  templates: ListChecks,
  admin: Database,
  account: UserRound,
  more: LayoutGrid,
};

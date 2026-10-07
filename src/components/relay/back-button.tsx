"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { IconButton } from "@/components/relay/icon-button";
import { cn } from "@/lib/utils";

/*
 * Tombol kembali halaman.
 * - Bila user sudah berpindah halaman di dalam app → router.back() (kembali persis ke halaman sebelumnya, filter/tab ikut).
 * - Bila halaman dibuka langsung (link, refresh, notifikasi) → ke halaman induk: /tasks/abc → /tasks, /admin/users → /admin, lainnya → /dashboard.
 */

let visits = 0;
let lastPath: string | null = null;

/** Dipasang sekali di layout app: menghitung navigasi di dalam sesi tab ini (aman dari effect ganda StrictMode). */
export function NavTracker() {
  const path = usePathname();
  useEffect(() => {
    if (path === lastPath) return;
    lastPath = path;
    visits += 1;
  }, [path]);
  return null;
}

export function parentOf(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/dashboard";
}

export function BackButton({ fallback, className }: { fallback?: string; className?: string }) {
  const router = useRouter();
  const path = usePathname();
  return (
    <IconButton
      icon={ArrowLeft}
      label="Kembali"
      variant="subtle"
      className={cn("size-9 [&_svg]:size-[18px]", className)}
      onClick={() => (visits > 1 ? router.back() : router.push(fallback ?? parentOf(path)))}
    />
  );
}

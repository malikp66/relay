"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { slide } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/users", label: "User" },
  { href: "/admin/groups", label: "Crew & org" },
  { href: "/admin/master", label: "Referensi" },
  { href: "/admin/locations", label: "Lokasi & pelanggan" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav data-tour="admin-nav" className="flex gap-0.5 overflow-x-auto rounded-xl bg-foreground/[0.05] p-[3px] [scrollbar-width:none] max-lg:[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] max-lg:pr-6">
      {ITEMS.map((it) => {
        const active = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={cn("relative flex h-[34px] shrink-0 items-center rounded-[9px] px-3 text-[13px] font-medium transition-colors duration-200", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-[9px] bg-background shadow-[0_1px_2px_rgb(16_24_40/0.08),0_0_0_0.5px_rgb(16_24_40/0.06)] dark:bg-white/[0.11] dark:shadow-none" transition={slide} />}
            <span className="relative">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

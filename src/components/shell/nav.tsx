"use client";

/**
 * Navigasi: bottom nav (mobile) & sidebar (desktop) dengan indikator aktif yang bergeser.
 * Terinspirasi KokonutUI Morphic Navbar (MIT) — https://kokonutui.com
 *
 * Indikator = satu elemen yang digeser lewat CSS transform (posisi relatif ke list),
 * bukan layoutId, supaya:
 *  - tidak ikut tersentak saat halaman di-scroll / sidebar sticky,
 *  - bisa langsung bergerak saat diklik (optimistic) tanpa menunggu server selesai render,
 *  - bisa diinterupsi dengan mulus (transisi CSS).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Role } from "@/db/schema";
import { BOTTOM_NAV, MORE_NAV, SIDEBAR_NAV, navItem, type NavKey } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";

function matches(path: string, key: NavKey, role: Role) {
  const href = navItem(key).href;
  if (key === "more") return path === "/more" || MORE_NAV[role].some((k) => path.startsWith(navItem(k).href));
  return path === href || path.startsWith(href + "/");
}

/** Item aktif: dari URL, tapi langsung pindah ke item yang diklik sampai URL-nya berubah. */
function useActiveKey(keys: NavKey[], role: Role) {
  const path = usePathname();
  const [pending, setPending] = useState<{ key: NavKey; from: string } | null>(null);
  const fromUrl = keys.find((k) => matches(path, k, role)) ?? null;
  const active = pending && pending.from === path ? pending.key : fromUrl;
  const select = (key: NavKey) => setPending({ key, from: path });
  return { active, select };
}

/** Menempatkan indikator di atas item aktif (tanpa re-render; langsung ke DOM). */
function useIndicator(listRef: RefObject<HTMLElement | null>, indicatorRef: RefObject<HTMLElement | null>, activeIndex: number, axis: "x" | "y") {
  const ready = useRef(false);
  useLayoutEffect(() => {
    const list = listRef.current;
    const ind = indicatorRef.current;
    if (!list || !ind) return;
    const place = () => {
      const item = list.querySelectorAll<HTMLElement>("[data-nav-item]")[activeIndex];
      if (!item) {
        ind.style.opacity = "0";
        return;
      }
      ind.style.opacity = "1";
      if (axis === "y") {
        ind.style.transform = `translate3d(0, ${item.offsetTop}px, 0)`;
        ind.style.height = `${item.offsetHeight}px`;
      } else {
        const w = ind.offsetWidth;
        ind.style.transform = `translate3d(${item.offsetLeft + (item.offsetWidth - w) / 2}px, 0, 0)`;
      }
      // posisi pertama tanpa animasi, setelah itu baru beranimasi
      if (!ready.current) {
        ready.current = true;
        requestAnimationFrame(() => ind.setAttribute("data-ready", ""));
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [listRef, indicatorRef, activeIndex, axis]);
}

export function BottomNav({ role, badges }: { role: Role; badges: Partial<Record<NavKey, number>> }) {
  const keys = BOTTOM_NAV[role];
  const { active, select } = useActiveKey(keys, role);
  const listRef = useRef<HTMLUListElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  useIndicator(listRef, indRef, active ? keys.indexOf(active) : -1, "x");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/[0.07] bg-background/85 pb-safe backdrop-blur-xl backdrop-saturate-150 lg:hidden">
      <ul ref={listRef} className="relative mx-auto grid h-[66px] max-w-lg grid-cols-5 px-1">
        {/* pill aktif — ukuran & posisi sama persis dengan wadah ikon (60×32, top 9px) */}
        <span
          ref={indRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-[9px] h-8 w-[60px] rounded-full bg-primary/[0.12] opacity-0 data-[ready]:transition-[transform,opacity] data-[ready]:duration-300 data-[ready]:ease-[var(--ease-out)] dark:bg-primary/20"
        />
        {keys.map((k) => {
          const it = navItem(k);
          const Icon = NAV_ICONS[k];
          const on = active === k;
          const badge = badges[k];
          return (
            <li key={k} data-nav-item className="flex justify-center">
              <Link
                href={it.href}
                data-tour={`nav-${k}`}
                onClick={() => select(k)}
                aria-current={on ? "page" : undefined}
                className="group flex w-full flex-col items-center pt-[9px] outline-none [-webkit-tap-highlight-color:transparent]"
              >
                <span className="relative flex h-8 w-[60px] items-center justify-center transition-transform duration-150 ease-[var(--ease-out)] group-active:scale-90">
                  <Icon className={cn("size-[21px] transition-colors duration-200", on ? "text-primary" : "text-muted-foreground")} strokeWidth={on ? 2.25 : 1.9} />
                  {badge ? (
                    <span className="tabular absolute left-[34px] top-[-3px] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-background">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
                <span className={cn("mt-[5px] text-[11px] leading-none tracking-[-0.005em] transition-colors duration-200", on ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SidebarNav({ role, badges }: { role: Role; badges: Partial<Record<NavKey, number>> }) {
  const keys = SIDEBAR_NAV[role];
  const { active, select } = useActiveKey(keys, role);
  const listRef = useRef<HTMLUListElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  useIndicator(listRef, indRef, active ? keys.indexOf(active) : -1, "y");

  return (
    <ul ref={listRef} className="relative flex flex-col gap-0.5">
      {/* Pill aktif: kartu putih yang "terangkat" + garis aksen kecil di kiri */}
      <span
        ref={indRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 rounded-[10px] opacity-0",
          "bg-background shadow-[0_1px_2px_rgb(16_24_40/0.06),0_0_0_1px_rgb(16_24_40/0.05)] dark:bg-white/[0.07] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]",
          "data-[ready]:transition-[transform,height,opacity] data-[ready]:duration-300 data-[ready]:ease-[var(--ease-out)]",
          "before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:content-['']",
        )}
      />
      {keys.map((k) => {
        const it = navItem(k);
        const Icon = NAV_ICONS[k];
        const on = active === k;
        const badge = badges[k];
        return (
          <li key={k} data-nav-item>
            <Link
              href={it.href}
              data-tour={`nav-${k}`}
              onClick={() => select(k)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "group relative flex h-9 items-center gap-2.5 rounded-[10px] px-3 text-[13.5px] font-medium outline-none",
                "transition-[color,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50",
                on ? "text-foreground" : "text-muted-foreground hover:bg-foreground/[0.035] hover:text-foreground",
              )}
            >
              <Icon className={cn("size-[17px] shrink-0 transition-colors duration-200", on ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground")} strokeWidth={on ? 2.2 : 2} />
              <span>{it.label}</span>
              {badge ? <span className="tabular ml-auto min-w-5 rounded-full bg-red-500/10 px-1.5 text-center text-[11px] font-semibold leading-5 text-red-600 dark:text-red-400">{badge}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

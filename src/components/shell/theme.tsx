"use client";

/**
 * Tema terang/gelap. Disimpan di localStorage ("relay-theme"), default mengikuti setting HP.
 * Toggle terinspirasi KokonutUI Switch Button (MIT), https://kokonutui.com
 * Animasi pergantian: reveal lingkaran via View Transitions API, diadaptasi dari
 * Magic UI Animated Theme Toggler (MIT), https://magicui.design (Nazam Kalsi dkk.)
 */
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('relay-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

export function useIsDark() {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("dark"), () => false);
}

export function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("relay-theme", dark ? "dark" : "light");
  } catch {}
}

const VT_MS = 450; // momen ganti tema sekali-sekali: reveal sedikit lebih lama dari transisi UI biasa agar terbaca

/**
 * Ganti tema dengan lingkaran yang melebar dari tombol yang ditekan.
 * Tanpa dukungan View Transitions / saat "reduce motion" → langsung ganti tanpa animasi.
 * Koordinat dalam persen (bukan px): Chrome salah menskalakan px di ::view-transition-new pada skala layar pecahan.
 */
export function switchTheme(dark: boolean, from?: Element | null) {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!from || reduce || typeof document.startViewTransition !== "function") return setTheme(dark);
  if (root.dataset.themeVt === "active") return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = from.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const maxR = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));
  const at = `${(x / vw) * 100}% ${(y / vh) * 100}%`;
  const radius = `${(maxR / (Math.hypot(vw, vh) / Math.SQRT2)) * 100}%`; // radius % dihitung terhadap hypot(w,h)/√2
  const clip = [`circle(0% at ${at})`, `circle(${radius} at ${at})`];

  root.dataset.themeVt = "active";
  root.style.setProperty("--theme-vt-ms", `${VT_MS}ms`);
  root.style.setProperty("--theme-vt-from", clip[0]);
  const cleanup = () => {
    delete root.dataset.themeVt;
    root.style.removeProperty("--theme-vt-ms");
    root.style.removeProperty("--theme-vt-from");
  };
  const vt = document.startViewTransition(() => setTheme(dark));
  vt.ready
    .then(() => root.animate({ clipPath: clip }, { duration: VT_MS, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards", pseudoElement: "::view-transition-new(root)" }))
    .catch(() => {});
  vt.finished.finally(cleanup).catch(() => {});
  setTimeout(cleanup, VT_MS + 1000); // pengaman: tab di latar belakang bisa menunda `finished`, tombol jangan sampai terkunci
}

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useIsDark();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Tema gelap"
      onClick={(e) => switchTheme(!dark, e.currentTarget)}
      className={cn("press relative h-8 w-[52px] shrink-0 rounded-full bg-foreground/[0.08] p-[3px] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/50", dark && "bg-primary", className)}
    >
      <span
        className={cn(
          "flex size-[26px] items-center justify-center rounded-full bg-background shadow-[0_1px_3px_rgb(0_0_0/0.15)] transition-transform duration-300 ease-[var(--ease-out)]",
          dark ? "translate-x-5" : "translate-x-0",
        )}
      >
        <Sun className={cn("absolute size-3.5 text-amber-500 transition-[opacity,transform] duration-300 ease-[var(--ease-out)]", dark ? "scale-50 -rotate-90 opacity-0" : "scale-100 opacity-100")} />
        <Moon className={cn("absolute size-3.5 text-primary transition-[opacity,transform] duration-300 ease-[var(--ease-out)]", dark ? "scale-100 opacity-100" : "scale-50 rotate-90 opacity-0")} />
      </span>
    </button>
  );
}

/** Tombol ikon ringkas untuk header — ikon crossfade + rotasi halus (CSS, tanpa remount). */
export function ThemeIconButton() {
  const dark = useIsDark();
  return (
    <button
      type="button"
      aria-label={dark ? "Mode terang" : "Mode gelap"}
      title={dark ? "Mode terang" : "Mode gelap"}
      onClick={(e) => switchTheme(!dark, e.currentTarget)}
      className="press relative flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Sun className={cn("absolute size-[18px] transition-[opacity,transform] duration-300 ease-[var(--ease-out)]", dark ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0")} />
      <Moon className={cn("absolute size-[18px] transition-[opacity,transform] duration-300 ease-[var(--ease-out)]", dark ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100")} />
    </button>
  );
}

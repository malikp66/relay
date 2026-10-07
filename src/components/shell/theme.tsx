"use client";

/**
 * Tema terang/gelap. Disimpan di localStorage ("relay-theme"), default mengikuti setting HP.
 * Toggle terinspirasi KokonutUI Switch Button (MIT) — https://kokonutui.com
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

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useIsDark();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Tema gelap"
      onClick={() => setTheme(!dark)}
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
      onClick={() => setTheme(!dark)}
      className="press relative flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Sun className={cn("absolute size-[18px] transition-[opacity,transform] duration-300 ease-[var(--ease-out)]", dark ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0")} />
      <Moon className={cn("absolute size-[18px] transition-[opacity,transform] duration-300 ease-[var(--ease-out)]", dark ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100")} />
    </button>
  );
}

"use client";

/**
 * Segmented tabs dengan indikator yang bergeser (spring tanpa pantulan).
 * Diadaptasi dari KokonutUI Smooth Tab (MIT) — https://kokonutui.com
 */
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { useId } from "react";
import { slide } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type TabItem = { id: string; label: string; icon?: LucideIcon; badge?: number | string };

export function SmoothTabs({ items, value, onChange, className }: { items: TabItem[]; value: string; onChange: (id: string) => void; className?: string }) {
  const layoutId = useId();
  return (
    <div role="tablist" className={cn("flex gap-0.5 overflow-x-auto rounded-xl bg-foreground/[0.05] p-[3px] [scrollbar-width:none]", className)}>
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={cn(
              "relative flex h-[34px] flex-[1_0_auto] items-center justify-center whitespace-nowrap rounded-[9px] px-3 text-[13px] font-medium outline-none",
              "transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/50",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={slide}
                className="absolute inset-0 rounded-[9px] bg-background shadow-[0_1px_2px_rgb(16_24_40/0.08),0_0_0_0.5px_rgb(16_24_40/0.06)] dark:bg-white/[0.11] dark:shadow-none"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 leading-none">
              {it.icon ? <it.icon className="hidden size-4 sm:block" /> : null}
              {it.label}
              {it.badge !== undefined && it.badge !== 0 ? (
                <span className={cn("tabular flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10.5px] font-semibold transition-colors duration-200", active ? "bg-foreground text-background" : "bg-foreground/[0.08] text-muted-foreground")}>
                  {it.badge}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

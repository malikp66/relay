"use client";

/**
 * Cincin progres (checklist, target harian, KPI).
 * Diadaptasi dari KokonutUI Apple Activity Card (MIT) — https://kokonutui.com
 */
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Ring = { value: number; max: number; color: string };

export function ProgressRings({ rings, size = 96, stroke = 10, children, className }: { rings: Ring[]; size?: number; stroke?: number; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      {rings.map((r, i) => {
        const s = size - i * (stroke * 2 + 4);
        const radius = (s - stroke) / 2;
        const c = 2 * Math.PI * radius;
        const pct = r.max > 0 ? Math.min(r.value / r.max, 1) : 0;
        return (
          <svg key={i} width={s} height={s} className="absolute -rotate-90" style={{ left: (size - s) / 2, top: (size - s) / 2 }} aria-hidden>
            <circle cx={s / 2} cy={s / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
            <motion.circle
              cx={s / 2}
              cy={s / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              stroke={r.color}
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c * (1 - pct) }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.23, 1, 0.32, 1] }}
            />
          </svg>
        );
      })}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function ProgressRing({ value, max, size = 64, stroke = 7, color = "var(--primary)", label }: { value: number; max: number; size?: number; stroke?: number; color?: string; label?: string }) {
  return (
    <ProgressRings rings={[{ value, max, color }]} size={size} stroke={stroke}>
      <span className="tabular text-sm font-semibold leading-none">{label ?? `${value}/${max}`}</span>
    </ProgressRings>
  );
}

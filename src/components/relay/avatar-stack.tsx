/**
 * Avatar bertumpuk untuk assignee.
 * Terinspirasi KokonutUI Team Selector (MIT) — https://kokonutui.com
 */
import { cn } from "@/lib/utils";

const COLORS = ["bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500"];

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function colorFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({ id, name, size = "md", className }: { id: string; name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sz = size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-11 text-sm" : "size-8 text-xs";
  return (
    <span title={name} className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-background", sz, colorFor(id), className)}>
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ people, max = 3, size = "sm" }: { people: { id: string; name: string }[]; max?: number; size?: "sm" | "md" }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((p, i) => (
        <Avatar key={p.id} id={p.id} name={p.name} size={size} className={i ? "-ml-2" : ""} />
      ))}
      {rest > 0 ? <span className="-ml-2 inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-background">+{rest}</span> : null}
    </span>
  );
}

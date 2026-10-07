import type { TaskStatus } from "@/db/schema";
import { PRIORITY_META, STATUS_META } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium tracking-[-0.005em] ring-1 ring-inset ring-current/10", m.chip, className)}>
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function PriorityLabel({ level, name, className }: { level: number; name: string; className?: string }) {
  const m = PRIORITY_META[level] ?? PRIORITY_META[1];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", m.text, className)}>
      <span className={cn("size-2 rounded-full", m.dot)} />
      {name}
    </span>
  );
}

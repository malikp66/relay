import Link from "next/link";
import { ArrowUpRight, CalendarClock, MapPin, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { STATUS_META } from "@/lib/labels";
import type { TaskListItem } from "@/server/queries";
import { fmtDateTime } from "@/lib/format";
import { SlaBadge } from "./sla-badge";
import { AvatarStack } from "./avatar-stack";
import { PriorityLabel, StatusBadge } from "./badges";

export function TaskCard({ task, showGroup, footnote }: { task: TaskListItem; showGroup?: boolean; footnote?: React.ReactNode }) {
  const pct = task.progress.total ? task.progress.done / task.progress.total : 0;
  return (
    <Link href={`/tasks/${task.id}`} style={{ "--tint": STATUS_META[task.status].tint } as CSSProperties} className="card-interactive group block rounded-2xl p-4 outline-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-mono">{task.code}</span>
            <span>·</span>
            <span>{task.productName}</span>
            {showGroup && (
              <>
                <span>·</span>
                <span>{task.groupName}</span>
              </>
            )}
          </div>
          <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-pretty">{task.title}</h3>
        </div>
        <ArrowUpRight className="reveal-arrow mt-0.5 size-[18px] shrink-0 text-muted-foreground" aria-hidden />
      </div>

      <div className="mt-2.5 flex flex-col gap-1 text-[13px] text-muted-foreground">
        {task.siteName && (
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3.5 shrink-0 opacity-70" />
            <span className="truncate">{task.customerName ?? task.siteName}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5 shrink-0 opacity-70" />
          {fmtDateTime(task.scheduledFor)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge status={task.status} />
        <PriorityLabel level={task.priorityLevel} name={task.priorityName} />
        <SlaBadge dueAt={task.dueAt} status={task.status} className="h-[22px] px-2 text-[11px]" />
        {task.revisionCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
            <RotateCcw className="size-3" />
            {task.revisionCount}x revisi
          </span>
        )}
        <span className="ml-auto">
          <AvatarStack people={task.assignees} />
        </span>
      </div>

      {task.progress.total > 0 && !["finished", "cancelled"].includes(task.status) && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/[0.07]">
            <div className="h-full origin-left rounded-full bg-[var(--tint)] transition-transform duration-500 ease-[var(--ease-out)]" style={{ transform: `scaleX(${pct})` }} />
          </div>
          <span className="tabular text-[11px] text-muted-foreground">
            {task.progress.done}/{task.progress.total}
          </span>
        </div>
      )}
      {footnote ? <p className="mt-3 border-t border-dashed pt-2.5 text-[12px] text-muted-foreground">{footnote}</p> : null}
    </Link>
  );
}

import { desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const db = await getDb();
  const rows = await db.select({ log: s.auditLogs, actor: s.users.name }).from(s.auditLogs).leftJoin(s.users, eq(s.users.id, s.auditLogs.actorId)).orderBy(desc(s.auditLogs.createdAt)).limit(100);
  return (
    <ul data-tour="audit-list" className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      {rows.map(({ log, actor }) => (
        <li key={log.id} className="flex items-start gap-3 px-4 py-3 text-sm">
          <span className="mt-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{log.action}</span>
          <div className="min-w-0 flex-1">
            <p>{log.summary}</p>
            <p className="text-xs text-muted-foreground">
              {actor ?? "Sistem"} · {log.entity} · {fmtDateTime(log.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

import { ClipboardCheck } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listTasks } from "@/server/queries";
import { TaskCard } from "@/components/relay/task-card";
import { EmptyState, PageHeader, Section } from "@/components/relay/page";
import { fmtDateTime, relative } from "@/lib/format";

export const metadata = { title: "Review" };

export default async function ReviewPage() {
  const user = await requireUser(["admin", "supervisor"]);
  const [queue, revision] = await Promise.all([listTasks(user, { view: "review" }), listTasks(user, { status: ["revision"] })]);
  const waiting = queue.filter((t) => t.status === "submitted").sort((a, b) => +new Date(a.lastSubmittedAt ?? 0) - +new Date(b.lastSubmittedAt ?? 0));
  const inReview = queue.filter((t) => t.status === "under_review");
  return (
    <div className="space-y-8">
      <PageHeader title="Review laporan" subtitle="Satu review per task, bukan per teknisi. Yang paling lama menunggu ada di atas." />
      <Section title="Menunggu review" count={waiting.length}>
        {waiting.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {waiting.map((t) => (
              <TaskCard key={t.id} task={t} showGroup={user.role === "admin"} footnote={`Dikirim ${fmtDateTime(t.lastSubmittedAt)} · menunggu ${relative(t.lastSubmittedAt).replace(" lalu", "")}`} />
            ))}
          </div>
        ) : (
          <EmptyState icon={ClipboardCheck} title="Tidak ada laporan baru" />
        )}
      </Section>
      <Section title="Sedang direview" count={inReview.length}>
        {inReview.length ? <div className="grid gap-3 md:grid-cols-2">{inReview.map((t) => <TaskCard key={t.id} task={t} showGroup={user.role === "admin"} />)}</div> : <p className="px-0.5 text-[13px] text-muted-foreground">Tidak ada.</p>}
      </Section>
      <Section title="Dikembalikan ke teknisi" count={revision.length}>
        {revision.length ? <div className="grid gap-3 md:grid-cols-2">{revision.map((t) => <TaskCard key={t.id} task={t} showGroup={user.role === "admin"} />)}</div> : <p className="px-0.5 text-[13px] text-muted-foreground">Tidak ada.</p>}
      </Section>
    </div>
  );
}

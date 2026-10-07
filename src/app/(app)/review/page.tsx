import { ClipboardCheck, Eye, RotateCcw } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listTasks } from "@/server/queries";
import { TaskCard } from "@/components/relay/task-card";
import { EmptyState, PageHeader } from "@/components/relay/page";
import { fmtDateTime, relative } from "@/lib/format";
import { ReviewTabs, type ReviewTab } from "./review-tabs";

export const metadata = { title: "Review" };

const TAB_INFO: Record<ReviewTab, { hint: string; empty: { icon: typeof ClipboardCheck; title: string; description: string } }> = {
  waiting: {
    hint: "Laporan baru dari teknisi. Yang paling lama menunggu ada di atas. Buka lalu tekan Mulai Review.",
    empty: { icon: ClipboardCheck, title: "Tidak ada laporan baru", description: "Laporan yang dikirim teknisi akan muncul di sini." },
  },
  in_review: {
    hint: "Laporan yang sudah mulai kamu review. Setujui, atau minta revisi dengan komentar.",
    empty: { icon: Eye, title: "Tidak ada yang sedang direview", description: "Tekan Mulai Review pada laporan di tab Menunggu." },
  },
  revision: {
    hint: "Task yang dikembalikan dan sedang diperbaiki teknisi. Akan kembali ke tab Direview setelah dikirim ulang.",
    empty: { icon: RotateCcw, title: "Tidak ada revisi berjalan", description: "Task yang diminta revisi akan muncul di sini." },
  },
};

export default async function ReviewPage({ searchParams }: PageProps<"/review">) {
  const user = await requireUser(["admin", "supervisor"]);
  const sp = await searchParams;
  const tab: ReviewTab = sp.tab === "in_review" || sp.tab === "revision" ? sp.tab : "waiting";
  const [queue, revision] = await Promise.all([listTasks(user, { view: "review" }), listTasks(user, { status: ["revision"] })]);
  const waiting = queue.filter((t) => t.status === "submitted").sort((a, b) => +new Date(a.lastSubmittedAt ?? 0) - +new Date(b.lastSubmittedAt ?? 0));
  const inReview = queue.filter((t) => t.status === "under_review");
  const lists: Record<ReviewTab, typeof queue> = { waiting, in_review: inReview, revision };
  const list = lists[tab];
  const info = TAB_INFO[tab];

  return (
    <div>
      <PageHeader title="Review laporan" subtitle="Satu review per task, bukan per teknisi." />
      <ReviewTabs value={tab} counts={{ waiting: waiting.length, in_review: inReview.length, revision: revision.length }} />
      <p className="mt-3 px-0.5 text-[13px] leading-relaxed text-muted-foreground">{info.hint}</p>
      <div data-tour="review-list" className="mt-4">
        {list.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                showGroup={user.role === "admin"}
                footnote={
                  tab === "revision"
                    ? `Revisi ke-${t.revisionCount}`
                    : t.lastSubmittedAt
                      ? `Dikirim ${fmtDateTime(t.lastSubmittedAt)} · ${tab === "waiting" ? "menunggu" : "masuk"} ${relative(t.lastSubmittedAt).replace(" lalu", "")}${tab === "waiting" ? "" : " lalu"}`
                      : undefined
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={info.empty.icon} title={info.empty.title} description={info.empty.description} />
        )}
      </div>
    </div>
  );
}

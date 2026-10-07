"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, Building2, Pencil, Plus } from "lucide-react";
import { moveMemberAction, saveGroupAction } from "@/app/actions/admin";
import { Avatar } from "@/components/relay/avatar-stack";
import { BottomSheet } from "@/components/relay/bottom-sheet";
import { IconButton } from "@/components/relay/icon-button";
import { notify } from "@/components/relay/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; role: string; isActive: boolean; memberRole: "supervisor" | "technician" };
type G = { id: string; name: string; code: string; description: string; categoryIds: string[]; members: Member[] };

export function OrgTree({ rootName, groups, categories, unassigned }: { rootName: string; groups: G[]; categories: { id: string; name: string }[]; unassigned: { id: string; name: string }[] }) {
  const [edit, setEdit] = useState<Partial<G> | null>(null);
  const [move, setMove] = useState<Member | null>(null);
  const [pending, start] = useTransition();
  const catName = (id: string) => categories.find((c) => c.id === id)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="size-4 text-primary" /> {rootName}
        </div>
        <Button size="sm" variant="outline" className="h-8 rounded-lg bg-card shadow-[var(--shadow-card)]" onClick={() => setEdit({ categoryIds: [] })}>
          <Plus className="size-4" /> Crew
        </Button>
      </div>
      <div className="relative space-y-4 border-l-2 border-dashed pl-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {groups.map((g) => {
          const spv = g.members.filter((m) => m.memberRole === "supervisor");
          const tech = g.members.filter((m) => m.memberRole === "technician");
          return (
            <div key={g.id} className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {g.name} <span className="font-mono text-xs text-muted-foreground">{g.code}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{g.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {g.categoryIds.map((c) => (
                      <span key={c} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        menangani {catName(c)}
                      </span>
                    ))}
                  </div>
                </div>
                <IconButton icon={Pencil} label="Ubah crew" onClick={() => setEdit(g)} className="-mr-1 -mt-1" />
              </div>
              <MemberList title={`Supervisor · ${spv.length}`} members={spv} onMove={setMove} />
              <MemberList title={`Teknisi · ${tech.length}`} members={tech} onMove={setMove} />
            </div>
          );
        })}
      </div>
      {unassigned.length > 0 && (
        <div className="rounded-2xl border border-dashed p-4">
          <p className="mb-2 text-sm font-medium">Belum punya crew</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((u) => (
              <button key={u.id} onClick={() => setMove({ ...u, role: "technician", isActive: true, memberRole: "technician" })} className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm hover:bg-muted">
                <Avatar id={u.id} name={u.name} size="sm" /> {u.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <BottomSheet open={!!move} onOpenChange={(o) => !o && setMove(null)} title={`Pindahkan ${move?.name ?? ""}`} description="Task yang sedang berjalan tetap dikerjakan orang yang sama.">
        <div className="space-y-2 pb-2">
          {groups.map((g) => (
            <Button
              key={g.id}
              variant="outline"
              className="h-12 w-full justify-start rounded-xl"
              disabled={pending || g.members.some((m) => m.id === move?.id)}
              onClick={() =>
                start(async () => {
                  const r = await moveMemberAction(move!.id, g.id);
                  if (r.ok) {
                    notify.success(`${move!.name} dipindah ke ${g.name}`);
                    setMove(null);
                  } else notify.error(r.error);
                })
              }
            >
              <ArrowRightLeft className="size-4" /> {g.name}
            </Button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit?.id ? "Ubah crew" : "Crew baru"}>
        {edit && (
          <form
            className="space-y-3 pb-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await saveGroupAction({ id: edit.id, name: edit.name ?? "", code: edit.code ?? "", description: edit.description, categoryIds: edit.categoryIds ?? [] });
                if (r.ok) {
                  notify.success("Crew tersimpan");
                  setEdit(null);
                } else notify.error(r.error);
              });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Kode</Label>
                <Input value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} className="h-11 rounded-xl" placeholder="CREW-C" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Menangani kategori</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const on = edit.categoryIds?.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => setEdit({ ...edit, categoryIds: on ? edit.categoryIds!.filter((x) => x !== c.id) : [...(edit.categoryIds ?? []), c.id] })} aria-pressed={!!on} className="chip h-10">
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl">
              Simpan
            </Button>
          </form>
        )}
      </BottomSheet>
    </div>
  );
}

function MemberList({ title, members, onMove }: { title: string; members: Member[]; onMove: (m: Member) => void }) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m.id} className={cn("flex items-center gap-2.5 rounded-xl px-1 py-1", !m.isActive && "opacity-50")}>
            <Avatar id={m.id} name={m.name} size="sm" />
            <span className="flex-1 truncate text-sm">{m.name}</span>
            <button onClick={() => onMove(m)} className="press rounded-lg px-2.5 py-1 text-[12.5px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.05] hover:text-foreground">
              Pindah
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

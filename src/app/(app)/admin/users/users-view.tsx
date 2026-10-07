"use client";

import { useState, useTransition } from "react";
import { KeyRound, Pencil, Plus, Power, Search } from "lucide-react";
import { resetPasswordAction, saveUserAction, toggleUserActiveAction } from "@/app/actions/admin";
import { Avatar } from "@/components/relay/avatar-stack";
import { BottomSheet } from "@/components/relay/bottom-sheet";
import { notify, useAlert } from "@/components/relay/alert";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/relay/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABEL } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/db/schema";

type U = { id: string; name: string; username: string; role: Role; title: string; phone: string; isActive: boolean; lastLoginAt: string | null; groupId: string };

export function UsersView({ users, groups }: { users: U[]; groups: { id: string; name: string }[] }) {
  const { confirm } = useAlert();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<U> | null>(null);
  const [pending, start] = useTransition();
  const list = users.filter((u) => (filter === "all" || u.role === filter) && (!q || `${u.name} ${u.username}`.toLowerCase().includes(q.toLowerCase())));
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name;

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) notify.success(msg);
      else notify.error(r.error ?? "Gagal");
    });

  return (
    <div className="space-y-3">
      <SmoothTabs
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "Semua", badge: users.length },
          { id: "technician", label: "Teknisi" },
          { id: "supervisor", label: "Supervisor" },
          { id: "admin", label: "Admin" },
        ]}
      />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / username" className="h-11 rounded-xl pl-10" />
        </div>
        <Button className="h-11 rounded-xl" onClick={() => setEdit({ role: "technician", groupId: groups[0]?.id ?? "" })}>
          <Plus className="size-4" /> User
        </Button>
      </div>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {list.map((u) => (
          <li key={u.id} className={cn("flex items-center gap-3 px-4 py-3", !u.isActive && "opacity-50")}>
            <Avatar id={u.id} name={u.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {u.name} {!u.isActive && <span className="text-xs text-red-600">(nonaktif)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{u.username} · {ROLE_LABEL[u.role]}
                {u.groupId ? ` · ${groupName(u.groupId)}` : ""} · login {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "belum pernah"}
              </p>
            </div>
            <IconButton icon={Pencil} label="Ubah user" onClick={() => setEdit(u)} />
          </li>
        ))}
      </ul>

      <BottomSheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit?.id ? "Ubah user" : "Tambah user"} description={edit?.id ? undefined : "Password awal: relay123 (demo)."}>
        {edit && (
          <form
            className="space-y-3 pb-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await saveUserAction({ id: edit.id, name: edit.name ?? "", username: edit.username ?? "", role: edit.role ?? "technician", title: edit.title, phone: edit.phone, groupId: edit.groupId || undefined });
                if (r.ok) {
                  notify.success("User tersimpan");
                  setEdit(null);
                } else notify.error(r.error);
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={edit.username ?? ""} onChange={(e) => setEdit({ ...edit, username: e.target.value })} className="h-11 rounded-xl" autoCapitalize="none" />
              </div>
              <div className="space-y-1.5">
                <Label>No. HP</Label>
                <Input value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="flex gap-2">
                {(["technician", "supervisor", "admin"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setEdit({ ...edit, role: r })} aria-pressed={edit.role === r} className="chip h-10 flex-1 rounded-xl">
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>
            {edit.role !== "admin" && (
              <div className="space-y-1.5">
                <Label>Crew</Label>
                <select value={edit.groupId ?? ""} onChange={(e) => setEdit({ ...edit, groupId: e.target.value })} className="h-11 w-full rounded-xl border bg-background px-3 text-sm">
                  <option value="">— Tanpa crew —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Jabatan</Label>
              <Input value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="h-11 rounded-xl" placeholder="mis. Teknisi Crew A" />
            </div>
            <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl">
              Simpan
            </Button>
            {edit.id && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={async () => {
                    if (await confirm({ title: `Reset password ${edit.name}?`, description: "Password kembali ke default dan user akan keluar dari semua perangkat.", tone: "warning", confirmLabel: "Reset" }))
                      act(() => resetPasswordAction(edit.id!), "Password direset ke relay123");
                  }}
                >
                  <KeyRound className="size-4" /> Reset password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl text-red-600"
                  onClick={async () => {
                    const on = (edit as U).isActive;
                    if (await confirm({ title: `${on ? "Nonaktifkan" : "Aktifkan"} ${edit.name}?`, description: on ? "User tidak bisa login dan langsung keluar dari semua perangkat." : undefined, tone: on ? "danger" : "info" }))
                      act(async () => {
                        const r = await toggleUserActiveAction(edit.id!);
                        if (r.ok) setEdit(null);
                        return r;
                      }, on ? "User dinonaktifkan" : "User diaktifkan");
                  }}
                >
                  <Power className="size-4" /> {(edit as U).isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>
            )}
          </form>
        )}
      </BottomSheet>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { KeyRound, Pencil, Plus, Power } from "lucide-react";
import { resetPasswordAction, saveUserAction, toggleUserActiveAction } from "@/app/actions/admin";
import { Avatar } from "@/components/relay/avatar-stack";
import { BottomSheet } from "@/components/relay/bottom-sheet";
import { notify, useAlert } from "@/components/relay/alert";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/relay/icon-button";
import { Field, SelectBox, TextInput } from "@/components/relay/form";
import { check, userSchema, type FieldErrors } from "@/lib/validation";
import { ROLE_LABEL } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/relay/search-input";
import type { Role } from "@/db/schema";

const ROLE_HINT: Record<Role, string> = {
  technician: "Mengerjakan task di lapangan: check-in, checklist, laporan.",
  supervisor: "Membuat task dan mereview laporan crew-nya.",
  admin: "Mengelola master data, user, dan semua crew.",
};

type U = { id: string; name: string; username: string; role: Role; title: string; phone: string; isActive: boolean; lastLoginAt: string | null; groupId: string };

export function UsersView({ users, groups }: { users: U[]; groups: { id: string; name: string }[] }) {
  const { confirm } = useAlert();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<U> | null>(null);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const openEdit = (u: Partial<U> | null) => {
    setEdit(u);
    setErrors({});
    setAttempted(false);
  };
  // setelah percobaan simpan pertama, error diperbarui setiap kali isian berubah
  const change = (patch: Partial<U>) => {
    const next = { ...edit, ...patch };
    setEdit(next);
    if (attempted) {
      const c = check(userSchema, { ...next, name: next.name ?? "", username: next.username ?? "", groupId: next.groupId || undefined });
      setErrors(c.ok ? {} : c.errors);
    }
  };
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
      <div data-tour="users-filter">
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
      </div>
      <div className="flex gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama atau username" />
        <Button data-tour="users-add" className="h-11 rounded-xl" onClick={() => openEdit({ role: "technician", groupId: groups[0]?.id ?? "" })}>
          <Plus className="size-4" /> User
        </Button>
      </div>
      <ul data-tour="users-list" className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
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
            <IconButton icon={Pencil} label="Ubah user" onClick={() => openEdit(u)} />
          </li>
        ))}
      </ul>

      <BottomSheet open={!!edit} onOpenChange={(o) => !o && openEdit(null)} title={edit?.id ? "Ubah user" : "Tambah user"} description={edit?.id ? undefined : "Password awal: relay123 (demo)."}>
        {edit && (
          <form
            noValidate
            className="space-y-4 pb-2"
            onSubmit={(e) => {
              e.preventDefault();
              setAttempted(true);
              const payload = { id: edit.id, name: edit.name ?? "", username: edit.username ?? "", role: edit.role ?? "technician", title: edit.title ?? "", phone: edit.phone ?? "", groupId: edit.groupId || undefined };
              const c = check(userSchema, payload);
              if (!c.ok) return setErrors(c.errors);
              start(async () => {
                const r = await saveUserAction(payload);
                if (r.ok) {
                  notify.success("User tersimpan");
                  setEdit(null);
                } else {
                  if (r.fieldErrors) setErrors(r.fieldErrors);
                  notify.error(r.error);
                }
              });
            }}
          >
            <Field label="Nama lengkap" error={errors.name}>
              {(id, d) => <TextInput id={id} aria-describedby={d} invalid={!!errors.name} value={edit.name ?? ""} onChange={(e) => change({ name: e.target.value })} placeholder="mis. Andi Pratama" />}
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Username" error={errors.username} hint="Untuk login. Huruf kecil, mis. tek.andi">
                {(id, d) => <TextInput id={id} aria-describedby={d} invalid={!!errors.username} value={edit.username ?? ""} onChange={(e) => change({ username: e.target.value })} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="tek.nama" />}
              </Field>
              <Field label="No. HP" optional error={errors.phone}>
                {(id, d) => <TextInput id={id} aria-describedby={d} invalid={!!errors.phone} inputMode="tel" value={edit.phone ?? ""} onChange={(e) => change({ phone: e.target.value })} placeholder="08xx-xxxx-xxxx" />}
              </Field>
            </div>
            <Field label="Role" error={errors.role} hint={ROLE_HINT[edit.role ?? "technician"]}>
              {() => (
                <div role="radiogroup" aria-label="Role" className="grid grid-cols-3 gap-2">
                  {(["technician", "supervisor", "admin"] as const).map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={edit.role === r} data-selected={edit.role === r} onClick={() => change({ role: r })} className="chip h-11 rounded-xl px-2">
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
              )}
            </Field>
            {edit.role !== "admin" && (
              <Field label="Crew" error={errors.groupId}>
                {(id, d) => <SelectBox id={id} describedBy={d} invalid={!!errors.groupId} value={edit.groupId ?? ""} onChange={(v) => change({ groupId: v })} options={groups} placeholder="Pilih crew" />}
              </Field>
            )}
            <Field label="Jabatan" optional error={errors.title}>
              {(id, d) => <TextInput id={id} aria-describedby={d} invalid={!!errors.title} value={edit.title ?? ""} onChange={(e) => change({ title: e.target.value })} placeholder="mis. Teknisi Crew A" />}
            </Field>
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

"use client";

import { useActionState, useEffect, useTransition } from "react";
import { notify } from "@/components/relay/notify";
import { Compass, LogOut } from "lucide-react";
import { useTour } from "@/components/tour/tour-provider";
import { changePasswordAction, logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountActions() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  const [out, start] = useTransition();
  const tour = useTour();
  useEffect(() => {
    if (state?.ok) notify.success(state.message);
  }, [state]);
  return (
    <>
      <form data-tour="account-password" action={action} className="space-y-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="font-medium">Ganti password</p>
        <div className="space-y-1.5">
          <Label htmlFor="current">Password lama</Label>
          <Input id="current" name="current" type="password" className="h-11 rounded-xl" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="next">Password baru</Label>
          <Input id="next" name="next" type="password" minLength={8} className="h-11 rounded-xl" required />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button disabled={pending} className="h-11 w-full rounded-xl">
          Simpan password
        </Button>
      </form>
      <Button variant="outline" className="h-12 w-full rounded-2xl bg-card shadow-[var(--shadow-card)]" onClick={() => tour.start()}>
        <Compass className="size-4" /> Lihat tur aplikasi
      </Button>
      <Button variant="outline" className="h-12 w-full rounded-2xl bg-card text-red-600 shadow-[var(--shadow-card)] hover:text-red-700" disabled={out} onClick={() => start(() => logoutAction())}>
        <LogOut className="size-4" /> Keluar
      </Button>
    </>
  );
}

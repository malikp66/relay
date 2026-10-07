"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useActionState, useTransition } from "react";
import { loginAction, switchDemoUserAction } from "@/app/actions/auth";
import { Avatar } from "@/components/relay/avatar-stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ACCOUNTS } from "@/lib/demo";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [demoPending, start] = useTransition();
  return (
    <div className="space-y-8">
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" autoComplete="username" autoCapitalize="none" placeholder="mis. tek.andi" className="h-12 rounded-xl" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" className="h-12 rounded-xl" required />
        </div>
        {state?.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{state.error}</p>}
        <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl text-[15px]">
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Masuk"}
        </Button>
      </form>

      <div>
        <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Masuk cepat (akun demo)
          <span className="h-px flex-1 bg-border" />
        </div>
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.username}>
              <button
                type="button"
                disabled={demoPending}
                onClick={() => start(() => switchDemoUserAction(a.username))}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors duration-150 hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.04] active:bg-foreground/[0.05] disabled:opacity-60"
              >
                <Avatar id={a.username} name={a.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.label}</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-center text-xs text-muted-foreground">Password semua akun demo: relay123</p>
      </div>
    </div>
  );
}

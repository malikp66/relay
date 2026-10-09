"use client";

/**
 * Menu akun di header.
 * Diadaptasi dari KokonutUI Profile Dropdown (MIT) — https://kokonutui.com
 */
import Link from "next/link";
import { Check, ChevronDown, Compass, LogOut, Repeat, UserRound } from "lucide-react";
import { useTour } from "@/components/tour/tour-provider";
import { useState, useTransition } from "react";
import { logoutAction, switchDemoUserAction } from "@/app/actions/auth";
import { Avatar } from "@/components/relay/avatar-stack";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { ROLE_LABEL } from "@/lib/labels";
import type { Role } from "@/db/schema";

export function UserMenu({ user }: { user: { id: string; name: string; username: string; role: Role; groupNames: string[] } }) {
  const [pending, start] = useTransition();
  const tour = useTour();
  // Daftar akun demo dibuka di dalam menu yang sama (bukan submenu ke samping yang keluar layar di HP).
  const [accounts, setAccounts] = useState(false);
  return (
    <DropdownMenu onOpenChange={(o) => !o && setAccounts(false)}>
      <DropdownMenuTrigger data-tour="user-menu" className="flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar id={user.id} name={user.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={12} className="w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl p-2">
        <DropdownMenuLabel className="flex items-center gap-3 p-2">
          <Avatar id={user.id} name={user.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {ROLE_LABEL[user.role]}
              {user.groupNames.length ? ` · ${user.groupNames.join(", ")}` : ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="h-10 rounded-xl">
          <Link href="/account">
            <UserRound className="size-4" /> Akun saya
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="h-10 rounded-xl" onSelect={() => tour.start()}>
          <Compass className="size-4" /> Tur aplikasi
        </DropdownMenuItem>
        <DropdownMenuItem
          className="h-10 rounded-xl"
          disabled={pending}
          aria-expanded={accounts}
          onSelect={(e) => {
            e.preventDefault();
            setAccounts((v) => !v);
          }}
        >
          <Repeat className="size-4" /> Ganti akun demo
          <ChevronDown className={cn("ml-auto size-4 text-muted-foreground transition-transform duration-200", accounts && "rotate-180")} />
        </DropdownMenuItem>
        {accounts && (
          <div className="mt-1 space-y-0.5 rounded-xl bg-foreground/[0.035] p-1">
            {DEMO_ACCOUNTS.map((a) => {
              const current = a.username === user.username;
              return (
                <DropdownMenuItem
                  key={a.username}
                  className="h-auto gap-2.5 rounded-lg px-2.5 py-2"
                  disabled={current || pending}
                  onSelect={() => start(() => switchDemoUserAction(a.username))}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.label}</p>
                  </div>
                  {current && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-10 rounded-xl text-red-600 focus:text-red-600" onSelect={() => start(() => logoutAction())}>
          <LogOut className="size-4" /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

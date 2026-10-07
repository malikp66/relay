"use client";

/**
 * Menu akun di header.
 * Diadaptasi dari KokonutUI Profile Dropdown (MIT) — https://kokonutui.com
 */
import Link from "next/link";
import { Compass, LogOut, Repeat, UserRound } from "lucide-react";
import { useTour } from "@/components/tour/tour-provider";
import { useTransition } from "react";
import { logoutAction, switchDemoUserAction } from "@/app/actions/auth";
import { Avatar } from "@/components/relay/avatar-stack";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { ROLE_LABEL } from "@/lib/labels";
import type { Role } from "@/db/schema";

export function UserMenu({ user }: { user: { id: string; name: string; username: string; role: Role; groupNames: string[] } }) {
  const [pending, start] = useTransition();
  const tour = useTour();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-tour="user-menu" className="flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar id={user.id} name={user.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
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
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="h-10 rounded-xl" disabled={pending}>
            <Repeat className="size-4" /> Ganti akun demo
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60 rounded-2xl p-2">
            {DEMO_ACCOUNTS.map((a) => (
              <DropdownMenuItem key={a.username} className="h-11 rounded-xl" disabled={a.username === user.username} onSelect={() => start(() => switchDemoUserAction(a.username))}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.label}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-10 rounded-xl text-red-600 focus:text-red-600" onSelect={() => start(() => logoutAction())}>
          <LogOut className="size-4" /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

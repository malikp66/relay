"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export function DatePicker() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return <Input type="date" defaultValue={sp.get("date") ?? today} max={today} onChange={(e) => router.replace(`${path}?date=${e.target.value}`)} className="h-10 w-auto rounded-xl" />;
}

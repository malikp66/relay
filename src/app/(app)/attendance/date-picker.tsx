"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DatePicker as Picker } from "@/components/relay/date-time-picker";

export function DatePicker() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return <Picker value={sp.get("date") ?? today} max={today} onChange={(d) => router.replace(`${path}?date=${d}`)} className="h-10 w-auto min-w-[200px] text-[13.5px]" />;
}

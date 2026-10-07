"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SmoothTabs } from "@/components/relay/smooth-tabs";
import { cn } from "@/lib/utils";

export type ReviewTab = "waiting" | "in_review" | "revision";

/** Tab antrian review — disimpan di URL (?tab=) agar bisa di-bookmark & tombol back berfungsi. */
export function ReviewTabs({ value, counts }: { value: ReviewTab; counts: Record<ReviewTab, number> }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <div data-tour="review-tabs" className={cn("transition-opacity duration-200", pending && "opacity-60")}>
      <SmoothTabs
        value={value}
        onChange={(id) => {
          const sp = new URLSearchParams(params.toString());
          if (id === "waiting") sp.delete("tab");
          else sp.set("tab", id);
          start(() => router.replace(`${path}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
        }}
        items={[
          { id: "waiting", label: "Menunggu", badge: counts.waiting },
          { id: "in_review", label: "Direview", badge: counts.in_review },
          { id: "revision", label: "Revisi", badge: counts.revision },
        ]}
      />
    </div>
  );
}

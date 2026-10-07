"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { notify } from "@/components/relay/notify";
import { Loader2, Plus } from "lucide-react";
import { generateFromPlanAction } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";

export function GeneratePlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 rounded-lg text-xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await generateFromPlanAction(planId);
          if (res.ok) {
            notify.success("Task maintenance dibuat", { description: "Jadwal berikutnya ikut diperbarui.", action: { label: "Buka task", onClick: () => router.push(`/tasks/${res.id}`) } });
          } else notify.error(res.error);
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Buat task sekarang
    </Button>
  );
}

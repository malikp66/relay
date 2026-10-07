"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { resetDemoAction } from "@/app/actions/admin";
import { notify, useAlert } from "@/components/relay/alert";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const { confirm } = useAlert();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-xl bg-background"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({ title: "Reset data demo?", description: "Semua perubahan (task baru, check-in, laporan) akan hilang dan diganti data dummy awal.", tone: "danger", confirmLabel: "Reset" });
        if (!ok) return;
        start(async () => {
          const r = await resetDemoAction();
          if (r.ok) {
            notify.success("Data demo direset");
            window.location.assign(new URL("/login", window.location.origin));
          } else notify.error(r.error);
        });
      }}
    >
      <RotateCcw className="size-4" /> {pending ? "Mereset…" : "Reset data demo"}
    </Button>
  );
}

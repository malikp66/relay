"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { ErrorScreen, HomeLink } from "./error-screen";

/** Isi error.tsx: tentukan kode dari pesan error (fallback 500) + tombol coba lagi. */
export function ErrorBoundaryView({ error, retry, compact }: { error: Error & { digest?: string }; retry: () => void; compact?: boolean }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const code = offline ? 408 : /timeout/i.test(error.message) ? 504 : /conflict|diubah orang lain/i.test(error.message) ? 409 : 500;
  return (
    <ErrorScreen
      compact={compact}
      code={code}
      description={offline ? "Kamu sedang offline. Sambungkan internet lalu coba lagi." : undefined}
      digest={error.digest}
      actions={
        <>
          <button onClick={() => retry()} className="press inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground">
            <RotateCw className="size-4" /> Coba lagi
          </button>
          <HomeLink variant="outline" />
        </>
      }
    />
  );
}

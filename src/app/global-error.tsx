"use client";

import "./globals.css";
import { THEME_SCRIPT } from "@/components/shell/theme";

/** Error di root layout: render dokumen sendiri (tanpa layout aplikasi). */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="id">
      <head>
        <title>Terjadi kesalahan · Relay</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
          <span className="text-7xl font-semibold tracking-tighter text-foreground/30">500</span>
          <h1 className="mt-4 text-xl font-semibold">Relay tidak bisa dimuat</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">Terjadi kesalahan pada aplikasi. Coba muat ulang. Jika terus terjadi, hubungi admin.</p>
          <div className="mt-6 flex gap-2">
            <button onClick={() => retry()} className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground">
              Coba lagi
            </button>
            <a href="/dashboard" className="inline-flex h-11 items-center rounded-xl border px-5 text-sm font-medium">
              Beranda
            </a>
          </div>
          {error.digest && <p className="mt-6 font-mono text-[11px] text-muted-foreground">Kode referensi: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}

import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <WifiOff className="size-7 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">Kamu sedang offline</h1>
      <p className="max-w-xs text-sm text-muted-foreground">Halaman ini belum tersimpan di perangkat. Halaman yang pernah dibuka tetap bisa dilihat. Coba lagi saat sinyal kembali.</p>
    </main>
  );
}

/**
 * Kerangka saat pindah halaman: header, menu, dan bottom nav (layout) tetap tampil,
 * konten diganti kerangka sampai data server siap. Membuat navigasi terasa langsung merespons.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Memuat halaman" className="animate-pulse space-y-6 [animation-duration:1.4s]">
      <div className="space-y-2.5">
        <div className="h-8 w-48 rounded-lg bg-foreground/[0.07]" />
        <div className="h-4 w-72 max-w-full rounded-md bg-foreground/[0.05]" />
      </div>
      <div className="h-10 w-full rounded-xl bg-foreground/[0.05]" />
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2.5 bg-card px-4 py-4">
            <div className="h-3 w-20 rounded bg-foreground/[0.06]" />
            <div className="h-6 w-12 rounded-md bg-foreground/[0.08]" />
          </div>
        ))}
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <div className="size-9 shrink-0 rounded-full bg-foreground/[0.07]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-md bg-foreground/[0.07]" />
              <div className="h-3 w-1/3 rounded bg-foreground/[0.05]" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Memuat…</span>
    </div>
  );
}

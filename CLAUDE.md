@AGENTS.md

# Relay — catatan untuk Claude

Rencana & tasklist: `../RENCANA_PENGERJAAN_RELAY.md`. Papan kerja: `../SPRINT_BOARD.md` (baca di awal sesi, centang task yang selesai).

## Konvensi
- UI teks Bahasa Indonesia; nama status mengikuti PRD (Assigned, In Progress, Job Done, …). Tanggal tampil WIB (`src/lib/format.ts`).
- Mobile-first: desain di 360px dulu; aksi utama di sticky bar bawah; konfirmasi aksi penting pakai `HoldButton`; dialog di mobile pakai `BottomSheet`.
- Komponen: primitives di `components/ui` (shadcn), komponen Relay di `components/relay` (adaptasi KokonutUI, beri atribusi di header file).
- Semua perubahan status task lewat `server/workflow.ts#transition` — jangan update kolom `status` langsung (kecuali check-in → in_progress di `checkInAction`).
- Otorisasi selalu di server: `requireUser(roles)` (forbidden() → 403), `taskScope(user)` untuk query list, `canViewTask/canManageTask/isAssignee`.
- Server Component tidak boleh mengoper fungsi ke Client Component — hitung string tampilan di server.
- Lint React Compiler aktif: hindari `setState` sinkron di `useEffect` (pakai `useSyncExternalStore` / handler), hindari `Date.now()` langsung di render server (pakai `nowMs()` dari `lib/clock`).
- Error/alert: notifikasi SELALU `notify.*` (`components/relay/notify.tsx`, kanan atas) — jangan import `toast` dari sonner langsung. `<Alert>` (inline, callout) & `useAlert().confirm()/banner` dari `components/relay/alert.tsx`. Di dev, `window.relayNotify` tersedia untuk uji. Halaman error via `ErrorScreen` + katalog `lib/errors.ts`.

## Gaya visual & motion (jangan "AI slop")
- Motion: hanya `transform`/`opacity`, ease-out `var(--ease-out)` / `ease.out` di `lib/motion.ts`, durasi 150–250 ms, spring tanpa pantulan (`slide`). Jangan `transition-all`, jangan animasikan `width`. Jangan tumpuk animasi di atas Vaul/Radix.
- Kartu interaktif: utility `card-interactive` (+ `--tint` per kartu, `data-selected`/`aria-pressed` untuk terpilih), panah hover `reveal-arrow`. Navigasi grid: `LinkCard` + `IconTile` (gaya Upstash console).
- Pilihan/chip: utility `chip` (terpilih = tint halus, bukan isi solid). Tekan: utility `press`.
- Tombol ikon/close: SELALU `IconButton` / `CloseButton` (`components/relay/icon-button.tsx`) — bulat, ikon tengah, hit area 40px.
- Hindari: teks gradasi, emoji dekoratif, bayangan besar, warna di luar token status, ikon dekoratif di kartu angka, angka berwarna tanpa makna.
- Ritme spasi: halaman `space-y-8`; `PageHeader` mb-6; `Section` (judul 15px + `count`) → isi 12px; kartu p-4 / sm:p-5; baris list px-4 py-2.5–3.
- Angka/KPI: `Metrics` (satu kartu, sel bergaris pemisah). Kartu berjudul: `Panel`. Bar ranking: `BarList`. Jangan bikin kartu angka sendiri.
- Filter: chip `Select` (lihat `stats/filters.tsx`), bukan `<select>` bawaan browser. Baris yang bisa digeser horizontal diberi fade mask di kanan.
- Grid berisi list/teks panjang: pakai `grid-cols-1` + `min-w-0` supaya tidak melebar di HP.

## Tur & langkah awal
- Langkah tur per role di `src/lib/tour.ts`; target = atribut `data-tour` (mis. `nav-tasks`, `home-summary`, `user-menu`, `setup`). Elemen terlihat pertama yang dipakai. Naikkan `TOUR_VERSION` bila tur berubah besar (semua user akan melihat lagi).
- Checklist "Mulai di sini": `server/setup.ts` (admin/supervisor, dari data) + `components/relay/setup-checklist.tsx` (teknisi: kesiapan perangkat).
- Status di halaman: pakai `Callout` (kartu netral + border kiri 3px berwarna yang ikut melengkung), bukan blok warna penuh.

## Data
- Demo: PGlite di `.data/pglite` (auto-migrate + seed). Ubah schema → `npx drizzle-kit generate` lalu hapus `.data/pglite` atau Reset data demo.
- Seed dummy: `src/db/seed.ts` (tanggal relatif terhadap waktu seed). Password akun demo `relay123`.

## Cek visual
Panel browser sering terlalu kecil. Pakai Chrome headless: buat `public/__preview.html` (iframe 390×844 per halaman, sama origin agar cookie jalan), buka lewat `/api/demo/login?as=<user>&to=/__preview.html?p=/a,/b`, `--screenshot`. Hapus file preview setelah selesai. Catatan: grafik Recharts bisa tampak kosong di headless (animasi).

## Cek sebelum selesai
`npx tsc --noEmit && npx eslint src && npx next build` (build pakai `PGLITE_DIR` sementara agar tidak bentrok dengan dev server).

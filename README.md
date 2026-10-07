# Relay — Field Operations Task Management (Demo)

PWA mobile-first untuk tim lapangan: supervisor membuat & menugaskan task, teknisi check-in di lokasi, mengisi checklist (centang / data / foto), menandai Job Done, menulis laporan, lalu supervisor mereview hingga task **Finished**.

> Versi ini memakai **data dummy** dan database Postgres tertanam (PGlite) supaya bisa langsung didemokan tanpa setup server.

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Database dibuat & diisi data dummy otomatis di `.data/pglite` saat pertama kali dijalankan.

Build production: `npm run build && npm start`. Service worker (PWA offline) hanya aktif di build production.

## Deploy ke Vercel

Vercel (serverless) **tidak punya disk persisten**, jadi database lokal PGlite tidak bisa dipakai di sana. Wajib pakai Postgres:

1. Buat database Postgres — paling mudah: Vercel → project → **Storage → Neon (Postgres)** → Connect. Ini otomatis menambah env `DATABASE_URL`.
   (Atau buat sendiri di neon.tech lalu isi `DATABASE_URL` di Settings → Environment Variables.)
2. Redeploy. Saat request pertama, aplikasi otomatis menjalankan migrasi & mengisi data demo (dikunci agar tidak dobel).
3. Cek: buka `/api/health` → harus `{"ok":true,"db":"postgres"}`.

Env opsional: `DEMO_MODE=false` (matikan login cepat demo), `PG_POOL_MAX` (default 3).

### Notifikasi (lonceng + push ke perangkat)

Notifikasi di dalam app (lonceng, toast, suara) jalan tanpa konfigurasi. Untuk **push ke HP/laptop walau Relay ditutup**, isi env:

| Env | Isi |
|---|---|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Pasangan kunci Web Push. Buat dengan `npx web-push generate-vapid-keys` (atau salin dari `.env.local`). Jangan diganti setelah dipakai — langganan perangkat lama akan berhenti. |
| `VAPID_SUBJECT` | Kontak pengelola, mis. `mailto:it@perusahaan.co.id` |
| `CRON_SECRET` (opsional) | Untuk `/api/cron/sla` (pengingat deadline). Tanpa cron pun pengingat tetap dicek tiap ±5 menit saat ada user membuka app. |

User mengaktifkan push di **Akun → Notifikasi** (atau tombol *Aktifkan* di lonceng). iPhone/iPad: Relay harus dipasang ke Layar Utama dulu (iOS 16.4+).

Kejadian yang dikirim: task baru (ke teknisi), teknisi check-in / Job Done (ke supervisor), laporan masuk / revisi dikirim ulang (ke supervisor), review dimulai / minta revisi / disetujui / dibatalkan (ke teknisi), deadline < 2 jam (ke teknisi), overdue (ke teknisi, supervisor, admin).
Foto bukti disimpan di tabel `files` di database, jadi tidak butuh storage terpisah untuk demo.

## Akun demo

Password semua akun: **`relay123`**. Di halaman login ada tombol **Masuk cepat**, dan di menu avatar ada **Ganti akun demo**.

| Role | Username | Lingkup |
|---|---|---|
| Admin | `admin` | Semua crew, master data, org tree |
| Supervisor Crew A (Troubleshoot) | `spv.budi` | Task & review Crew A |
| Supervisor Crew B (Maintenance) | `spv.sari` | Task & review Crew B |
| Teknisi Crew A | `tek.andi` (+ `tek.dedi`, `tek.eko`, `tek.fajar`) | Task yang ditugaskan |
| Teknisi Crew B | `tek.gilang` (+ `tek.hendra`, `tek.indra`, `tek.joko`) | Task yang ditugaskan |

**Tautan langsung per role** (praktis untuk demo):
`/api/demo/login?as=spv.budi&to=/review` — ganti `as` dan `to` sesuai kebutuhan. Matikan dengan env `DEMO_MODE=false`.

## Skenario demo ke PM (±10 menit)

1. **Teknisi (Andi)** — Beranda: cincin progres hari ini, task revisi, status absensi.
   Buka *Internet mati total – Ahmad Fauzi* (In Progress) → tab **Checklist**: isi kecepatan, ambil foto, centang konfirmasi → **tahan tombol "Selesai Kerja"** → tulis laporan (autosave) → **tahan "Kirim Laporan"**.
   Coba kirim laporan kosong → ditolak dengan daftar field yang kurang.
2. **Teknisi** — buka task *Assigned* → **tahan "Check-in"**. Di laptop tanpa GPS, pilih "Simulasikan: saya di lokasi". Status otomatis jadi In Progress. Coba check-in di task lain saat masih check-in → ditolak.
3. **Supervisor (Budi)** — **Review** → buka laporan → **Mulai Review** → **Revisi** (komentar wajib) → kembali sebagai Andi, **Kirim Ulang** → sebagai Budi **tahan "Approve"** → task **Finished** & terkunci. Lihat tab **Riwayat** (pass review, absensi, timeline).
4. **Supervisor** — **Buat task**: pilih kategori + produk → checklist terisi dari template → pilih lokasi, prioritas (deadline otomatis dari SLA), teknisi → simpan.
5. **Supervisor** — **Beranda** (antrian review, beban tim), **Absensi tim**, **Jadwal** (kalender + rencana maintenance berulang → "Buat task sekarang"), **Statistik** (throughput, SLA, revisi, absensi).
6. **Admin** — **Master data**: user (tambah, reset password, nonaktifkan), **Crew & org** (pindah teknisi antar crew, scope kategori), referensi (kategori, produk, prioritas & SLA), lokasi & pelanggan, **Audit log**. Template checklist di menu **Template**.
7. **Batas akses** — sebagai Budi, buka URL task Crew B → halaman **403**. URL ngawur → **404**. Contoh halaman status lain: `/status/503`.
8. **Reset** — Admin → Master data → **Reset data demo** untuk kembali ke kondisi awal.

## Yang sudah ada

- Login & sesi (cookie httpOnly), ganti password, role-aware menu (bottom nav mobile, sidebar desktop)
- RBAC di server: supervisor hanya group-nya, teknisi hanya task yang ditugaskan, admin semua
- Workflow status lengkap (Assigned → In Progress → Job Done → Submitted → Under Review ⟲ Revision → Approved → Finished, + Cancelled) dengan guard sesuai PRD
- Checklist bertipe (tick / data / foto) dengan template per kategori × produk, gating Job Done
- Laporan dinamis per kategori (Troubleshoot ≠ Maintenance), dikerjakan bersama, autosave
- Review berulang dengan riwayat pass, `revision_count`, task Finished read-only
- Attendance: GPS + jarak ke lokasi (geofence), terlambat, 1 check-in aktif per teknisi
- Dashboard per role, jadwal/kalender, rencana maintenance berulang, statistik (§10 rencana)
- Admin master data + org tree + audit log
- PWA: manifest, ikon, install prompt (Android) / panduan iOS, service worker (app shell & foto), halaman offline, indikator koneksi
- Tema terang/gelap, halaman error per kode (401/403/404/500/… + global), global alert (`useAlert`, `<Alert>`, `notify`)

## Belum (sesuai rencana sprint)

- Antrian sinkron offline untuk checklist/foto (RLY-405–407) — saat ini offline hanya menampilkan halaman yang pernah dibuka
- Penyimpanan foto ke R2/S3 (sekarang lokal di `.data/uploads`) & database Neon untuk production
- Editor template laporan, import CSV, export statistik, notifikasi (di luar scope PRD)

## Struktur

```
src/
  app/(auth)/login          halaman login
  app/(app)/...             semua halaman setelah login (dashboard, tasks, review, attendance, schedule, stats, templates, admin, account)
  app/actions/              server actions (auth, tasks, admin)
  app/api/                  upload foto, file, demo login
  components/relay/         komponen Relay (banyak diadaptasi dari KokonutUI)
  components/shell/         app shell: nav, tema, PWA, koneksi
  components/ui/            primitives shadcn/ui
  db/                       schema Drizzle, koneksi PGlite, seed data dummy
  server/                   auth, policy (RBAC), workflow (state machine), queries, stats
```

Komponen KokonutUI yang diadaptasi: Hold Button, Smooth Drawer, Smooth Tab, Apple Activity Card, File Upload, Profile Dropdown, Team Selector, Toolbar, Switch Button, Morphic Navbar. Registry `@kokonutui` sudah terdaftar di `components.json`.

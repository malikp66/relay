import type { Role } from "@/db/schema";

/**
 * Langkah tur per role. `target` = nilai atribut data-tour pada elemen di layar
 * (elemen pertama yang terlihat dipakai — jadi sama untuk bottom nav HP & sidebar desktop).
 * Langkah tanpa target tampil sebagai kartu di tengah.
 */
export type TourStep = { target?: string; title: string; body: string };

export const TOUR_VERSION = "v1";

export const TOURS: Record<Role, TourStep[]> = {
  technician: [
    { title: "Selamat datang di Relay", body: "Semua pekerjaan lapangan kamu ada di sini: tugas, check-in, checklist, foto, dan laporan. Tur ini cuma 1 menit." },
    { target: "home-summary", title: "Ringkasan hari ini", body: "Lihat berapa tugas tersisa, yang sudah selesai, dan yang perlu direvisi." },
    { target: "nav-tasks", title: "Tugas", body: "Semua tugas yang ditugaskan ke kamu. Buka tugas untuk check-in, isi checklist, ambil foto, lalu kirim laporan." },
    { target: "nav-attendance", title: "Absensi", body: "Status check-in kamu saat ini dan riwayatnya. Check-in dilakukan dari halaman tugas saat tiba di lokasi." },
    { title: "Tekan & tahan", body: "Aksi penting seperti Check-in, Selesai Kerja, dan Kirim Laporan memakai tombol tekan-tahan supaya tidak salah pencet." },
  ],
  supervisor: [
    { title: "Selamat datang di Relay", body: "Kelola tugas crew kamu dari pembuatan, pengerjaan di lapangan, sampai review laporan." },
    { target: "home-summary", title: "Kondisi crew", body: "Antrian review, task overdue, teknisi yang sedang di lokasi, dan task selesai minggu ini." },
    { target: "nav-tasks", title: "Buat & pantau tugas", body: "Buat task baru — checklist terisi otomatis dari template kategori & produk — lalu tugaskan ke satu atau beberapa teknisi." },
    { target: "nav-review", title: "Review laporan", body: "Laporan yang dikirim teknisi masuk ke sini. Setujui, atau minta revisi dengan komentar." },
    { target: "nav-schedule", title: "Jadwal", body: "Kalender kunjungan & maintenance berulang untuk perencanaan minggu ini." },
    { target: "user-menu", title: "Akun & tema", body: "Ganti password, tema gelap, atau buka lagi tur ini kapan saja dari menu ini." },
  ],
  admin: [
    { title: "Selamat datang, Admin", body: "Kamu mengelola struktur tim dan data referensi Relay, serta memantau kedua crew." },
    { target: "setup", title: "Langkah awal", body: "Checklist ini memandu menyiapkan Relay: crew, user, lokasi, template, dan SLA." },
    { target: "home-summary", title: "Ringkasan semua crew", body: "Task aktif, overdue, selesai, dan kualitas laporan lintas crew." },
    { target: "nav-admin", title: "Master data", body: "Kelola user, crew & org tree, lokasi, pelanggan, kategori, produk, dan SLA — tanpa developer." },
    { target: "nav-stats", title: "Statistik", body: "Throughput, waktu & SLA, revisi, dan kepatuhan absensi — bisa difilter per crew, produk, dan teknisi." },
    { target: "user-menu", title: "Akun & tur", body: "Buka lagi tur ini atau ganti akun demo dari menu ini." },
  ],
};

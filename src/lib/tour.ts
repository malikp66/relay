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
    { target: "notifications", title: "Notifikasi", body: "Task baru, revisi, dan persetujuan muncul di sini, lengkap dengan suara. Aktifkan notifikasi perangkat supaya tetap dapat kabar walau Relay ditutup." },
    { target: "help", title: "Butuh penjelasan?", body: "Setiap halaman punya tombol Panduan di samping judulnya. Tekan untuk tur singkat halaman itu." },
  ],
  supervisor: [
    { title: "Selamat datang di Relay", body: "Kelola tugas crew kamu dari pembuatan, pengerjaan di lapangan, sampai review laporan." },
    { target: "home-summary", title: "Kondisi crew", body: "Antrian review, task overdue, teknisi yang sedang di lokasi, dan task selesai minggu ini." },
    { target: "nav-tasks", title: "Buat & pantau tugas", body: "Buat task baru (checklist terisi otomatis dari template kategori & produk), lalu tugaskan ke satu atau beberapa teknisi." },
    { target: "nav-review", title: "Review laporan", body: "Laporan yang dikirim teknisi masuk ke sini. Setujui, atau minta revisi dengan komentar." },
    { target: "nav-schedule", title: "Jadwal", body: "Kalender kunjungan & maintenance berulang untuk perencanaan minggu ini." },
    { target: "notifications", title: "Notifikasi", body: "Laporan masuk, teknisi mulai bekerja, dan task overdue dikabarkan di sini, juga ke HP kamu bila notifikasi perangkat aktif." },
    { target: "help", title: "Panduan per halaman", body: "Di setiap halaman, tekan Panduan di samping judul untuk penjelasan singkat fitur halaman itu." },
    { target: "user-menu", title: "Akun & tema", body: "Ganti password, tema gelap, atau buka lagi tur ini kapan saja dari menu ini." },
  ],
  admin: [
    { title: "Selamat datang, Admin", body: "Kamu mengelola struktur tim dan data referensi Relay, serta memantau kedua crew." },
    { target: "setup", title: "Langkah awal", body: "Checklist ini memandu menyiapkan Relay: crew, user, lokasi, template, dan SLA." },
    { target: "home-summary", title: "Ringkasan semua crew", body: "Task aktif, overdue, selesai, dan kualitas laporan lintas crew." },
    { target: "nav-admin", title: "Master data", body: "Kelola user, crew & org tree, lokasi, pelanggan, kategori, produk, dan SLA tanpa perlu developer." },
    { target: "nav-stats", title: "Statistik", body: "Throughput, waktu & SLA, revisi, dan kepatuhan absensi. Bisa difilter per crew, produk, dan teknisi." },
    { target: "notifications", title: "Notifikasi", body: "Kabar penting lintas crew. Atur suara dan notifikasi perangkat di halaman Akun." },
    { target: "help", title: "Panduan per halaman", body: "Setiap halaman punya tur singkat. Tekan Panduan di samping judul halaman." },
    { target: "user-menu", title: "Akun & tur", body: "Buka lagi tur ini atau ganti akun demo dari menu ini." },
  ],
};

/* ───────────── Tur per halaman (tombol "Panduan" di header) ───────────── */

type PageTour = { match: (path: string) => boolean; title: string; steps: TourStep[] };
const exact = (p: string) => (path: string) => path === p;

export const PAGE_TOURS: PageTour[] = [
  {
    match: exact("/tasks"),
    title: "Tugas",
    steps: [
      { target: "task-tabs", title: "Kelompok tugas", body: "Aktif = sedang berjalan, Review = menunggu keputusan, Overdue = lewat deadline, Selesai = sudah ditutup." },
      { target: "task-search", title: "Cari cepat", body: "Ketik kode task, judul, nama pelanggan, atau lokasi." },
      { target: "task-filter", title: "Filter", body: "Saring berdasarkan crew, kategori, produk, prioritas, atau teknisi." },
      { target: "task-list", title: "Kartu tugas", body: "Warna garis & badge menunjukkan status. Lihat prioritas, sisa SLA, jumlah revisi, teknisi, dan progres checklist. Ketuk untuk membuka." },
      { target: "task-create", title: "Buat task baru", body: "Checklist otomatis terisi dari template kategori & produk. Tugaskan ke satu atau beberapa teknisi." },
    ],
  },
  {
    match: exact("/tasks/new"),
    title: "Buat task",
    steps: [
      { target: "new-1", title: "Kategori & produk", body: "Menentukan crew yang menangani dan template checklist yang dipakai." },
      { target: "new-3", title: "Lokasi", body: "Pilih pelanggan atau site. Titik lokasi dipakai untuk verifikasi check-in teknisi." },
      { target: "new-4", title: "Prioritas & jadwal", body: "Deadline terisi otomatis dari SLA prioritas dan tetap bisa diubah." },
      { target: "new-5", title: "Teknisi", body: "Bisa lebih dari satu. Mereka berbagi satu checklist dan satu laporan." },
      { target: "new-6", title: "Checklist", body: "Tambah, hapus, ubah tipe (centang / data / foto), atur wajib atau opsional, dan urutannya." },
      { target: "new-submit", title: "Simpan", body: "Task langsung berstatus Assigned dan muncul di HP teknisi." },
    ],
  },
  {
    match: (p) => /^\/tasks\/[0-9a-f-]{36}$/.test(p),
    title: "Detail tugas",
    steps: [
      { target: "task-stepper", title: "Alur status", body: "Assigned → In Progress → Job Done → Submitted → Under Review → Finished. Revisi mengembalikan task ke teknisi." },
      { target: "task-detail-tabs", title: "Isi tugas", body: "Info lokasi & jadwal, Checklist bukti kerja, Laporan, dan Riwayat (review, absensi, timeline)." },
      { target: "task-actions", title: "Aksi utama", body: "Tombol di bawah berubah sesuai status & peran kamu. Aksi penting memakai tekan-tahan agar tidak salah pencet." },
    ],
  },
  {
    match: exact("/review"),
    title: "Review",
    steps: [
      { target: "review-tabs", title: "Tiga antrian", body: "Menunggu = laporan baru, Direview = sedang kamu periksa, Revisi = sedang diperbaiki teknisi. Angka menunjukkan jumlahnya." },
      { target: "review-list", title: "Daftar laporan", body: "Ketuk kartu untuk membuka laporan & bukti checklist, lalu Mulai Review → Approve atau minta Revisi." },
    ],
  },
  {
    match: exact("/attendance"),
    title: "Absensi",
    steps: [
      { target: "att-status", title: "Status kamu", body: "Menunjukkan apakah kamu sedang check-in di lokasi dan sudah berapa lama." },
      { target: "att-ready", title: "Siap check-in", body: "Tugas yang bisa kamu mulai. Buka lalu tahan tombol Check-in saat tiba di lokasi." },
      { target: "att-history", title: "Riwayat", body: "Check-in 14 hari terakhir, lengkap dengan tanda terlambat atau di luar radius." },
      { target: "att-date", title: "Pilih tanggal", body: "Lihat absensi tim pada tanggal tertentu." },
      { target: "att-metrics", title: "Ringkasan", body: "Jumlah check-in, teknisi hadir, yang terlambat, dan yang check-in di luar radius lokasi." },
      { target: "att-onsite", title: "Di lokasi sekarang", body: "Teknisi yang sedang check-in saat ini." },
      { target: "att-list", title: "Daftar check-in", body: "Jam masuk dan keluar setiap teknisi per task. Ketuk untuk membuka task-nya." },
    ],
  },
  {
    match: exact("/schedule"),
    title: "Jadwal",
    steps: [
      { target: "sched-filters", title: "Filter jadwal", body: "Saring menurut status, kategori, produk, crew, atau teknisi. Kalender, agenda, dan ringkasan ikut menyesuaikan." },
      { target: "sched-metrics", title: "Ringkasan minggu ini", body: "Jumlah jadwal minggu yang dipilih: belum dikerjakan (termasuk yang lewat jam mulai), sedang berjalan, dan selesai." },
      { target: "sched-calendar", title: "Kalender", body: "Titik warna = ada jadwal di hari itu. Ketuk tanggal untuk melihat minggunya." },
      { target: "sched-agenda", title: "Agenda minggu ini", body: "Semua kunjungan per hari dengan jam, status, lokasi, dan teknisi." },
      { target: "sched-weeknav", title: "Pindah minggu", body: "Geser ke minggu sebelum atau sesudahnya." },
      { target: "sched-plans", title: "Maintenance berulang", body: "Rencana rutin mingguan/bulanan. Sistem membuat task-nya otomatis menjelang jadwal." },
    ],
  },
  {
    match: exact("/stats"),
    title: "Statistik",
    steps: [
      { target: "stats-range", title: "Periode", body: "Bandingkan 7, 30, atau 90 hari terakhir." },
      { target: "stats-filters", title: "Filter", body: "Persempit per crew, kategori, produk, atau teknisi." },
      { target: "stats-throughput", title: "Throughput", body: "Task selesai vs dibuat, tren harian, dan sebaran per produk." },
      { target: "stats-sla", title: "Waktu & SLA", body: "Rata-rata durasi tiap fase dan persentase task yang memenuhi SLA." },
      { target: "stats-quality", title: "Kualitas laporan", body: "Seberapa sering laporan dikembalikan untuk revisi, per teknisi." },
      { target: "stats-attendance", title: "Kepatuhan absensi", body: "Check-in valid dalam radius dan tingkat keterlambatan per teknisi." },
    ],
  },
  {
    match: exact("/templates"),
    title: "Template",
    steps: [
      { target: "tpl-mode", title: "Checklist & laporan", body: "Template checklist per produk, dan field laporan per kategori." },
      { target: "tpl-products", title: "Pilih template", body: "Satu template untuk tiap kombinasi kategori × produk." },
      { target: "tpl-items", title: "Item checklist", body: "Seret pegangan ⠿ untuk mengubah urutan, klik label untuk mengubah teks, atur wajib/opsional, atau hapus item. Perubahan hanya berlaku untuk task baru." },
      { target: "tpl-add", title: "Tambah item", body: "Pilih tipe: centang, isi data (dengan satuan), atau foto." },
      { target: "tpl-preview", title: "Tampilan di HP teknisi", body: "Begini checklist ini terlihat di HP teknisi. Ikut berubah saat kamu mengedit." },
      { target: "rpt-fields", title: "Field laporan", body: "Ubah label, tipe (teks, angka, pilihan, ya/tidak), wajib, dan urutan. Field Pilihan diisi opsinya langsung di baris itu." },
      { target: "rpt-add", title: "Tambah field", body: "Ketik label, pilih tipe, lalu Tambah. Tekan Simpan di bar bawah untuk membuat versi baru." },
      { target: "rpt-preview", title: "Tampilan di HP teknisi", body: "Begini form laporan terlihat saat teknisi mengisinya. Laporan yang sudah dibuat tetap memakai versi lamanya." },
    ],
  },
  {
    match: exact("/admin"),
    title: "Master data",
    steps: [
      { target: "admin-nav", title: "Bagian master data", body: "User, crew & org tree, referensi, lokasi & pelanggan, dan audit log." },
      { target: "admin-cards", title: "Pintasan", body: "Ringkasan jumlah data dan jalan pintas ke tiap bagian." },
      { target: "admin-reset", title: "Reset demo", body: "Kembalikan seluruh data ke kondisi awal demo." },
    ],
  },
  {
    match: exact("/admin/users"),
    title: "User",
    steps: [
      { target: "users-filter", title: "Filter role", body: "Tampilkan teknisi, supervisor, atau admin saja." },
      { target: "users-add", title: "Tambah user", body: "Isi nama, username, role, dan crew. Password awal bisa langsung dipakai login." },
      { target: "users-list", title: "Kelola user", body: "Ketuk ikon pensil untuk mengubah, reset password, atau menonaktifkan akun." },
    ],
  },
  {
    match: exact("/admin/groups"),
    title: "Crew & org tree",
    steps: [
      { target: "groups-tree", title: "Struktur tim", body: "Setiap crew punya supervisor, teknisi, dan kategori yang ditangani." },
      { target: "groups-add", title: "Crew baru", body: "Tambah crew dan tentukan kategori pekerjaannya." },
      { target: "groups-move", title: "Pindah anggota", body: "Pindahkan teknisi antar crew. Task yang sedang berjalan tidak terpengaruh." },
    ],
  },
  {
    match: (p) => p === "/admin/master" || p === "/admin/locations",
    title: "Data referensi",
    steps: [
      { target: "master-section", title: "Daftar data", body: "Data yang dipakai di seluruh aplikasi." },
      { target: "master-add", title: "Tambah", body: "Tambah data baru lewat formulir di bottom sheet." },
      { target: "master-row", title: "Ubah & hapus", body: "Data yang masih dipakai task tidak bisa dihapus." },
    ],
  },
  {
    match: exact("/admin/audit"),
    title: "Audit log",
    steps: [
      { target: "audit-filters", title: "Cari & saring", body: "Cari kata di aktivitas, atau saring menurut jenis data, aksi, dan pelaku." },
      { target: "audit-list", title: "Jejak perubahan", body: "Setiap perubahan master data, user, dan template tercatat per hari: siapa, apa, kapan. Tekan Buka untuk ke halaman datanya." },
    ],
  },
  {
    match: exact("/account"),
    title: "Akun",
    steps: [
      { target: "account-profile", title: "Profil", body: "Nama, username, role, dan crew kamu." },
      { target: "account-notif", title: "Notifikasi", body: "Nyalakan notifikasi perangkat, atur suara, dan kirim notifikasi uji." },
      { target: "account-theme", title: "Tema", body: "Terang atau gelap, tersimpan di perangkat ini." },
      { target: "account-password", title: "Ganti password", body: "Minimal 8 karakter." },
    ],
  },
  {
    match: exact("/more"),
    title: "Lainnya",
    steps: [{ target: "more-list", title: "Menu tambahan", body: "Halaman yang tidak muat di menu bawah." }],
  },
];

/** Katalog halaman error per kode HTTP (Bahasa Indonesia, ramah pengguna lapangan). */
export const ERRORS = {
  400: { title: "Permintaan tidak valid", description: "Ada data yang tidak sesuai. Periksa kembali isian kamu lalu coba lagi." },
  401: { title: "Sesi berakhir", description: "Silakan masuk kembali untuk melanjutkan." },
  403: { title: "Akses ditolak", description: "Halaman ini tidak tersedia untuk role kamu. Supervisor hanya melihat group-nya, teknisi hanya tugas yang ditugaskan." },
  404: { title: "Halaman tidak ditemukan", description: "Halaman yang kamu cari tidak ada, sudah dipindah, atau tautannya salah." },
  408: { title: "Koneksi terlalu lama", description: "Server tidak merespons tepat waktu. Periksa sinyal lalu coba lagi." },
  409: { title: "Data sudah berubah", description: "Data ini baru saja diubah orang lain. Muat ulang halaman untuk melihat versi terbaru." },
  413: { title: "File terlalu besar", description: "Ukuran foto maksimal 10 MB. Coba ambil ulang foto dengan resolusi lebih kecil." },
  429: { title: "Terlalu banyak percobaan", description: "Tunggu sebentar sebelum mencoba lagi." },
  500: { title: "Terjadi kesalahan", description: "Ada masalah di sisi kami. Tim sudah tercatat otomatis — coba lagi beberapa saat." },
  502: { title: "Server tidak dapat dihubungi", description: "Layanan sedang bermasalah sementara. Coba lagi beberapa saat." },
  503: { title: "Sedang pemeliharaan", description: "Relay sedang diperbarui. Silakan coba lagi beberapa menit lagi." },
  504: { title: "Server terlalu lama merespons", description: "Coba lagi. Jika terus terjadi, hubungi admin." },
} as const;

export type ErrorCode = keyof typeof ERRORS;
export const isErrorCode = (n: number): n is ErrorCode => n in ERRORS;

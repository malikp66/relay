import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relay — Field Operations",
    short_name: "Relay",
    description: "Kelola pekerjaan lapangan: tugas, absensi, checklist, laporan, dan review.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#2563eb",
    lang: "id",
    icons: [
      { src: "/pwa-icon/192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512.png", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Tugas saya", url: "/tasks", icons: [{ src: "/pwa-icon/96.png", sizes: "96x96" }] },
      { name: "Absensi", url: "/attendance", icons: [{ src: "/pwa-icon/96.png", sizes: "96x96" }] },
    ],
  };
}

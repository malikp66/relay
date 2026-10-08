import { Box, Cable, Cctv, MonitorPlay, Phone, RadioTower, Router, Satellite, Server, Tv, Wifi, type LucideIcon } from "lucide-react";

/**
 * Ikon produk yang bisa dipilih Admin di Master data → Produk.
 * Daftar tetap (bukan bebas) supaya ikon selalu relevan dengan layanan telko dan tampil konsisten.
 */
export const PRODUCT_ICONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "fiber", label: "Kabel / fiber", icon: Cable },
  { id: "radio", label: "Radio / tower", icon: RadioTower },
  { id: "tv", label: "TV / IPTV", icon: Tv },
  { id: "broadcast", label: "Siaran digital", icon: MonitorPlay },
  { id: "router", label: "Router", icon: Router },
  { id: "wifi", label: "Wi-Fi", icon: Wifi },
  { id: "satellite", label: "Satelit", icon: Satellite },
  { id: "server", label: "Server", icon: Server },
  { id: "phone", label: "Telepon", icon: Phone },
  { id: "cctv", label: "CCTV", icon: Cctv },
  { id: "box", label: "Lainnya", icon: Box },
];
export const PRODUCT_ICON_IDS = PRODUCT_ICONS.map((i) => i.id) as [string, ...string[]];

const BY_ID: Record<string, LucideIcon> = Object.fromEntries(PRODUCT_ICONS.map((i) => [i.id, i.icon]));

/** Ikon produk dari id tersimpan; id kosong/tidak dikenal → kotak (Lainnya). */
export function ProductIcon({ id, className }: { id: string | null | undefined; className?: string }) {
  const Icon = BY_ID[id ?? ""] ?? Box;
  return <Icon className={className} aria-hidden />;
}
export const productIconLabel = (id: string | null | undefined) => PRODUCT_ICONS.find((i) => i.id === id)?.label ?? "Lainnya";

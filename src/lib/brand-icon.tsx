/**
 * Logo Relay: ikon "R" dengan garis kecepatan (sumber: public/relay-icon.svg).
 * Turunan PNG dibuat dari file itu: public/brand/relay-icon.png (UI), src/app/icon.png (favicon),
 * src/app/apple-icon.png, public/pwa-icon/* (PWA, maskable, badge).
 */
export const BRAND_BLUE = "#1555F3";

export function BrandMark({ size, className }: { size: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/relay-icon.png" width={size} height={size} alt="Relay" className={className} style={{ width: size, height: size }} draggable={false} />;
}

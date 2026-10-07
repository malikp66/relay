import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-icon";

export async function GET(_req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await ctx.params;
  const [n, kind] = size.replace(".png", "").split("-");
  const px = Math.min(Math.max(Number(n) || 192, 48), 1024);
  if (kind === "badge") {
    // ikon kecil status bar Android: siluet putih di latar transparan
    return new ImageResponse(
      (
        <svg width={px} height={px} viewBox="0 0 64 64">
          <path d="M18 44 C 18 26, 46 38, 46 20" stroke="white" strokeWidth="7" fill="none" strokeLinecap="round" />
          <circle cx="18" cy="44" r="8" fill="white" />
          <circle cx="46" cy="20" r="8" fill="white" />
        </svg>
      ),
      { width: px, height: px },
    );
  }
  return new ImageResponse(<BrandMark size={px} maskable={kind === "maskable"} />, { width: px, height: px });
}

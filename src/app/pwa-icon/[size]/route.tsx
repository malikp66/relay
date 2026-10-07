import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-icon";

export async function GET(_req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await ctx.params;
  const [n, kind] = size.replace(".png", "").split("-");
  const px = Math.min(Math.max(Number(n) || 192, 48), 1024);
  return new ImageResponse(<BrandMark size={px} maskable={kind === "maskable"} />, { width: px, height: px });
}

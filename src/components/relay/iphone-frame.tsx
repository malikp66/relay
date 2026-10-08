import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bingkai iPhone untuk pratinjau tampilan teknisi.
 * Diadaptasi dari Magic UI iPhone (MIT), https://magicui.design (dillionverma, Yeom-JinHo).
 * Bedanya: layar berisi konten React yang bisa digulir (bukan gambar/video), dynamic island digambar di atas konten.
 */
const PHONE_W = 433;
const PHONE_H = 882;
const SCREEN_X = 21.25;
const SCREEN_Y = 19.25;
const SCREEN_W = 389.5;
const SCREEN_H = 843.5;
const SCREEN_R = 55.75;
const ISLAND_BOTTOM = 67; // batas bawah dynamic island (koordinat bingkai)

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const FILL_EDGE = "fill-[#E5E5E5] dark:fill-[#404040]";

export function IphoneFrame({ children, className, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("relative w-full", className)} style={{ aspectRatio: `${PHONE_W}/${PHONE_H}` }} {...props}>
      {/* bodi & tombol samping */}
      <svg viewBox={`0 0 ${PHONE_W} ${PHONE_H}`} fill="none" aria-hidden className="absolute inset-0 size-full">
        <path d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z" className={FILL_EDGE} />
        <path d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z" className={FILL_EDGE} />
        <path d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z" className={FILL_EDGE} />
        <path d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z" className={FILL_EDGE} />
        <path d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z" className={FILL_EDGE} />
        <path d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z" className="fill-white dark:fill-[#262626]" />
        <path opacity="0.5" d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z" className={FILL_EDGE} />
      </svg>

      {/* layar: konten asli, bisa digulir */}
      <div
        className="absolute flex flex-col overflow-hidden bg-background"
        style={{ left: pct(SCREEN_X, PHONE_W), top: pct(SCREEN_Y, PHONE_H), width: pct(SCREEN_W, PHONE_W), height: pct(SCREEN_H, PHONE_H), borderRadius: `${pct(SCREEN_R, SCREEN_W)} / ${pct(SCREEN_R, SCREEN_H)}` }}
      >
        <div className="shrink-0" style={{ height: pct(ISLAND_BOTTOM - SCREEN_Y + 10, SCREEN_H) }} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 [scrollbar-width:none]">{children}</div>
      </div>

      {/* dynamic island di atas konten */}
      <svg viewBox={`0 0 ${PHONE_W} ${PHONE_H}`} fill="none" aria-hidden className="pointer-events-none absolute inset-0 size-full">
        <path d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z" className="fill-[#0a0a0a]" />
        <path d="M254 48.5C254 45.4624 256.462 43 259.5 43C262.538 43 265 45.4624 265 48.5C265 51.5376 262.538 54 259.5 54C256.462 54 254 51.5376 254 48.5Z" className="fill-[#1f1f1f]" />
      </svg>
    </div>
  );
}

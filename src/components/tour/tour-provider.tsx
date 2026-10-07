"use client";

/**
 * Tur aplikasi ringan (tanpa library): spotlight pada elemen ber-atribut data-tour
 * + kartu penjelasan. Mulai otomatis sekali per user per versi; bisa diputar ulang via useTour().start().
 */
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Role } from "@/db/schema";
import { TOURS, TOUR_VERSION, type TourStep } from "@/lib/tour";
import { CloseButton } from "@/components/relay/icon-button";
import { cn } from "@/lib/utils";

type Ctx = { start: () => void; active: boolean };
const TourCtx = createContext<Ctx>({ start: () => {}, active: false });
export const useTour = () => useContext(TourCtx);

const storageKey = (userId: string) => `relay-tour-${TOUR_VERSION}:${userId}`;
export const tourDone = (userId: string) => {
  try {
    return localStorage.getItem(storageKey(userId)) === "done";
  } catch {
    return true;
  }
};

export function TourProvider({ userId, role, children }: { userId: string; role: Role; children: ReactNode }) {
  const steps = TOURS[role];
  const [index, setIndex] = useState<number | null>(null);
  const path = usePathname();
  const router = useRouter();

  const finish = useCallback(() => {
    try {
      localStorage.setItem(storageKey(userId), "done");
    } catch {}
    window.dispatchEvent(new Event("relay-tour-done"));
    setIndex(null);
  }, [userId]);

  const start = useCallback(() => {
    if (path !== "/dashboard") router.push("/dashboard");
    setIndex(0);
  }, [path, router]);

  // auto-start sekali di beranda
  useEffect(() => {
    if (path !== "/dashboard" || tourDone(userId)) return;
    const t = setTimeout(() => setIndex((i) => i ?? 0), 700);
    return () => clearTimeout(t);
  }, [path, userId]);

  const value = useMemo(() => ({ start, active: index !== null }), [start, index]);

  return (
    <TourCtx.Provider value={value}>
      {children}
      {index !== null && <TourOverlay steps={steps} index={index} onIndex={setIndex} onClose={finish} />}
    </TourCtx.Provider>
  );
}

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 6;

function findTarget(name?: string) {
  if (!name) return null;
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return els.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  }) ?? null;
}

function TourOverlay({ steps, index, onIndex, onClose }: { steps: TourStep[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const step = steps[index];
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(180);

  // ukur posisi target (dan ikuti scroll/resize)
  useLayoutEffect(() => {
    let raf = 0;
    const el = findTarget(step.target);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      const t = findTarget(step.target);
      if (!t) return setRect(null);
      const r = t.getBoundingClientRect();
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };
    const loop = () => {
      measure();
      raf = requestAnimationFrame(loop);
    };
    // ukur terus selama ~600ms (menunggu smooth scroll), lalu hanya saat resize/scroll
    loop();
    const stop = setTimeout(() => cancelAnimationFrame(raf), 650);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(stop);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.target]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [index, rect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        if (index < steps.length - 1) onIndex(index + 1);
        else onClose();
      }
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, steps.length, onIndex, onClose]);

  // posisi kartu: di bawah target bila muat, kalau tidak di atas; tanpa target → tengah
  const cardW = Math.min(340, vw - 32);
  let cardStyle: React.CSSProperties = { width: cardW, left: (vw - cardW) / 2, top: Math.max(16, (vh - cardH) / 2) };
  if (rect) {
    const below = rect.top + rect.height + 12;
    const above = rect.top - cardH - 12;
    const top = below + cardH < vh - 16 ? below : Math.max(16, above);
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16);
    cardStyle = { width: cardW, left, top };
  }

  const last = index === steps.length - 1;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* lapisan gelap + spotlight (satu elemen, bayangan raksasa) */}
      <button type="button" aria-label="Tutup tur" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-[14px] ring-2 ring-white/70 transition-[top,left,width,height,opacity] duration-300 ease-[var(--ease-out)] dark:ring-white/40"
        style={
          rect
            ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgb(9 9 11 / 0.58)" }
            : { top: vh / 2, left: vw / 2, width: 0, height: 0, boxShadow: "0 0 0 9999px rgb(9 9 11 / 0.58)", opacity: 1 }
        }
      />
      <div
        ref={cardRef}
        key={index}
        style={cardStyle}
        className="absolute rounded-2xl border bg-popover p-4 text-popover-foreground shadow-[var(--shadow-pop)] transition-[top,left] duration-300 ease-[var(--ease-out)] animate-in fade-in-0 zoom-in-[0.97] duration-200"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="tabular text-[11.5px] font-medium text-muted-foreground">
              {index + 1} dari {steps.length}
            </p>
            <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">{step.title}</h2>
          </div>
          <CloseButton size="sm" label="Lewati tur" onClick={onClose} className="-mr-1 -mt-1" />
        </div>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {steps.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-out)]", i === index ? "w-4 bg-primary" : "w-1.5 bg-foreground/15")} />
            ))}
          </div>
          {index > 0 && (
            <button type="button" onClick={() => onIndex(index - 1)} className="press flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Kembali
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => (last ? onClose() : onIndex(index + 1))}
            className="press flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {last ? "Selesai" : "Lanjut"}
            {!last && <ArrowRight className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

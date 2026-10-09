"use client";

/**
 * Tur aplikasi ringan (tanpa library): spotlight pada elemen ber-atribut data-tour
 * + kartu penjelasan. Mulai otomatis sekali per user per versi; bisa diputar ulang via useTour().start().
 */
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Role } from "@/db/schema";
import { PAGE_TOURS, TOURS, TOUR_VERSION, type TourStep } from "@/lib/tour";
import { CloseButton } from "@/components/relay/icon-button";
import { cn } from "@/lib/utils";

/** Jarak celah spotlight dari tepi elemen target (px). */
const SPOT_PAD = 6;
/** Kotak spotlight = target + celah, dijepit di dalam layar (sisakan ruang untuk garis & glow 7px). */
function spotBox(r: { top: number; left: number; width: number; height: number }, vw: number, vh: number) {
  const m = 8;
  const top = Math.max(m, r.top - SPOT_PAD);
  const left = Math.max(m, r.left - SPOT_PAD);
  const bottom = Math.min(vh - m, r.top + r.height + SPOT_PAD);
  const right = Math.min(vw - m, r.left + r.width + SPOT_PAD);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

type Ctx = { start: () => void; startPage: () => void; hasPageTour: boolean; active: boolean };
const TourCtx = createContext<Ctx>({ start: () => {}, startPage: () => {}, hasPageTour: false, active: false });
export const useTour = () => useContext(TourCtx);

const storageKey = (userId: string) => `relay-tour-${TOUR_VERSION}:${userId}`;
export const tourDone = (userId: string) => {
  try {
    return localStorage.getItem(storageKey(userId)) === "done";
  } catch {
    return true;
  }
};

/** Langkah yang targetnya ada & terlihat di layar (langkah tanpa target selalu ikut). */
function availableSteps(steps: TourStep[]) {
  return steps.filter((st) => !st.target || findTarget(st.target));
}

/*
 * Identitas user untuk tur dikirim terpisah lewat <TourIdentity> (dirender di dalam Suspense di layout),
 * supaya layout tidak perlu menunggu data login sebelum menampilkan halaman → navigasi langsung merespons.
 */
type Identity = { userId: string; role: Role } | null;
let identity: Identity = null;
const identitySubs = new Set<() => void>();
const subscribeIdentity = (cb: () => void) => {
  identitySubs.add(cb);
  return () => identitySubs.delete(cb);
};
export function TourIdentity({ userId, role }: { userId: string; role: Role }) {
  useEffect(() => {
    if (identity?.userId === userId && identity.role === role) return;
    identity = { userId, role };
    identitySubs.forEach((cb) => cb());
  }, [userId, role]);
  return null;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const id = useSyncExternalStore(subscribeIdentity, () => identity, () => null);
  const userId = id?.userId ?? "";
  const role = id?.role;
  const [tour, setTour] = useState<{ steps: TourStep[]; index: number; welcome: boolean; path: string } | null>(null);
  const path = usePathname();
  const router = useRouter();
  const pageTour = PAGE_TOURS.find((t) => t.match(path));

  // Efek samping (localStorage + event) di luar updater setState: updater bisa dijalankan saat render
  // dan memicu setState komponen lain (SetupChecklist) di tengah render.
  const close = useCallback(() => {
    if (tour?.welcome) {
      try {
        localStorage.setItem(storageKey(userId), "done");
      } catch {}
      window.dispatchEvent(new Event("relay-tour-done"));
    }
    setTour(null);
  }, [tour, userId]);

  /** Tur perkenalan per role (di Beranda). */
  const start = useCallback(() => {
    if (!role) return;
    if (path !== "/dashboard") router.push("/dashboard");
    setTimeout(() => setTour({ steps: availableSteps(TOURS[role]), index: 0, welcome: true, path: "/dashboard" }), path === "/dashboard" ? 0 : 600);
  }, [path, router, role]);

  /** Tur halaman saat ini (tombol Panduan). */
  const startPage = useCallback(() => {
    if (path === "/dashboard" || !pageTour) return start();
    const steps = availableSteps(pageTour.steps);
    if (steps.length) setTour({ steps, index: 0, welcome: false, path });
  }, [path, pageTour, start]);

  // auto-start tur perkenalan sekali di beranda
  useEffect(() => {
    if (!role || !userId || path !== "/dashboard" || tourDone(userId)) return;
    const t = setTimeout(() => setTour((cur) => cur ?? { steps: availableSteps(TOURS[role]), index: 0, welcome: true, path: "/dashboard" }), 700);
    return () => clearTimeout(t);
  }, [path, userId, role]);

  // tur halaman otomatis tidak tampil lagi bila user pindah halaman
  const visible = tour && tour.steps.length > 0 && (tour.welcome || tour.path === path);

  const value = useMemo(() => ({ start, startPage, hasPageTour: path === "/dashboard" || !!pageTour, active: !!visible }), [start, startPage, path, pageTour, visible]);

  return (
    <TourCtx.Provider value={value}>
      {children}
      {visible && (
        <TourOverlay steps={tour.steps} index={tour.index} onIndex={(i) => setTour((t) => (t ? { ...t, index: i } : t))} onClose={close} />
      )}
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
    if (el) {
      // elemen tinggi → gulir ke bagian atasnya (di bawah header sticky); elemen kecil → ke tengah
      const tall = el.getBoundingClientRect().height > window.innerHeight * 0.55;
      el.style.scrollMarginTop = "76px";
      el.scrollIntoView({ block: tall ? "start" : "center", behavior: "smooth" });
    }
    const measure = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      const t = findTarget(step.target);
      if (!t) return setRect(null);
      const r = t.getBoundingClientRect();
      // potong spotlight agar tetap di dalam layar (di bawah header, di atas tepi bawah)
      const top = Math.max(r.top - PAD, 8);
      const bottom = Math.min(r.bottom + PAD, window.innerHeight - 8);
      setRect({ top, left: r.left - PAD, width: r.width + PAD * 2, height: Math.max(bottom - top, 24) });
    };
    const loop = () => {
      measure();
      raf = requestAnimationFrame(loop);
    };
    // ukur terus selama ~600ms (menunggu smooth scroll), lalu hanya saat resize/scroll
    loop();
    const stop = setTimeout(() => cancelAnimationFrame(raf), 900);
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
    const below = rect.top + rect.height + SPOT_PAD + 12;
    const above = rect.top - SPOT_PAD - cardH - 12;
    // di bawah target bila muat; kalau tidak di atasnya; kalau dua-duanya tidak muat (target setinggi layar) → menempel di bawah layar
    const top = below + cardH < vh - 16 ? below : above >= 16 ? above : Math.max(16, vh - cardH - 84);
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16);
    cardStyle = { width: cardW, left, top };
  }

  const last = index === steps.length - 1;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* lapisan gelap + spotlight (satu elemen, bayangan raksasa) */}
      <button type="button" aria-label="Tutup tur" onClick={onClose} className="absolute inset-0 cursor-default" />
      {/* Spotlight: celah 6px di sekitar target + garis aksen + glow, sisanya diredupkan.
          Warna redup & glow per tema (globals.css: --tour-dim, --tour-glow) — di dark mode latar sudah
          hampir hitam, jadi redupnya harus lebih pekat dan target diberi garis aksen agar tetap menonjol. */}
      <div
        aria-hidden
        className="tour-spotlight pointer-events-none absolute rounded-[16px] transition-[top,left,width,height,opacity] duration-300 ease-[var(--ease-out)]"
        style={
          rect
            ? spotBox(rect, vw, vh)
            : { top: vh / 2, left: vw / 2, width: 0, height: 0, opacity: 1 }
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

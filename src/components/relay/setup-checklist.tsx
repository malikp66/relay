"use client";

/**
 * Kartu "Mulai di sini". Admin/Supervisor: langkah setup dari data server.
 * Teknisi: kesiapan perangkat (pasang aplikasi, izin lokasi) dicek langsung di HP.
 * Bisa ditutup (disimpan per user). Tersembunyi otomatis bila semua selesai & sudah ditutup.
 */
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, ChevronDown, Compass, MapPin, Smartphone } from "lucide-react";
import type { Role } from "@/db/schema";
import type { SetupItem } from "@/server/setup";
import { CloseButton } from "./icon-button";
import { ProgressRing } from "./progress-ring";
import { useTour, tourDone } from "@/components/tour/tour-provider";
import { cn } from "@/lib/utils";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("relay-tour-done", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("relay-tour-done", cb);
  };
};
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

function useDevice() {
  const [geo, setGeo] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  useEffect(() => {
    let alive = true;
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (!alive) return;
        setGeo(p.state as typeof geo);
        p.onchange = () => setGeo(p.state as typeof geo);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const standalone = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(display-mode: standalone)").matches || !!(navigator as unknown as { standalone?: boolean }).standalone,
    () => false,
  );
  return { geo, standalone };
}

export function SetupChecklist({ userId, role, items }: { userId: string; role: Role; items: SetupItem[] }) {
  const { start } = useTour();
  const dismissKey = `relay-setup-dismissed:${userId}`;
  const dismissed = useSyncExternalStore(subscribe, () => read(dismissKey) === "1", () => true);
  const toured = useSyncExternalStore(subscribe, () => tourDone(userId), () => true);
  const [open, setOpen] = useState(true);
  const device = useDevice();

  const all: (SetupItem & { action?: () => void; icon?: typeof MapPin })[] =
    role === "technician"
      ? [
          { id: "install", title: "Pasang Relay di HP", description: "Buka dari layar utama seperti aplikasi biasa.", href: "/account", done: device.standalone, icon: Smartphone },
          {
            id: "location",
            title: "Izinkan akses lokasi",
            description: device.geo === "denied" ? "Akses ditolak — aktifkan lewat pengaturan browser." : "Dibutuhkan untuk check-in di lokasi pelanggan.",
            href: "#",
            done: device.geo === "granted",
            icon: MapPin,
            action: () => navigator.geolocation?.getCurrentPosition(() => {}, () => {}),
          },
          { id: "tour", title: "Ikuti tur singkat", description: "1 menit mengenal cara kerja Relay.", href: "#", done: toured, icon: Compass, action: start },
        ]
      : [...items, { id: "tour", title: "Ikuti tur singkat", description: "Kenali menu utama dalam 1 menit.", href: "#", done: toured, icon: Compass, action: start }];

  const done = all.filter((i) => i.done).length;
  const complete = done === all.length;
  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {}
    emit();
  };

  return (
    <section data-tour="setup" className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
        <ProgressRing value={done} max={all.length} size={44} stroke={5} color={complete ? "#10b981" : "var(--primary)"} label={`${done}/${all.length}`} />
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left outline-none" aria-expanded={open}>
          <p className="text-[15px] font-semibold tracking-[-0.01em]">{complete ? "Relay siap dipakai" : role === "technician" ? "Siapkan HP kamu" : "Mulai di sini"}</p>
          <p className="text-[12.5px] text-muted-foreground">{complete ? "Semua langkah awal sudah selesai." : `${all.length - done} langkah lagi`}</p>
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Ciutkan" : "Buka"} className="press flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground">
          <ChevronDown className={cn("size-4 transition-transform duration-300 ease-[var(--ease-out)]", open && "rotate-180")} />
        </button>
        <CloseButton size="md" label="Sembunyikan" onClick={dismiss} />
      </div>
      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out)]", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <ol className="min-h-0 divide-y overflow-hidden border-t">
          {all.map((it) => {
            const content = (
              <>
                <span
                  className={cn(
                    "flex size-[22px] shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                    it.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-foreground/20 text-transparent",
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[14px] font-medium leading-snug", it.done && "text-muted-foreground line-through decoration-foreground/25")}>{it.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{it.description}</span>
                </span>
                {!it.done && <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5" />}
              </>
            );
            const cls = "group flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors duration-150 hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.04] sm:px-5";
            if (it.done) return <li key={it.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">{content}</li>;
            return (
              <li key={it.id}>
                {it.action ? (
                  <button type="button" onClick={it.action} className={cls}>
                    {content}
                  </button>
                ) : (
                  <Link href={it.href} className={cls}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

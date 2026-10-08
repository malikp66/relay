"use client";

import "leaflet/dist/leaflet.css";
import type { Circle, Map as LMap, Marker, TileLayer } from "leaflet";
import { ExternalLink, Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BOX } from "@/components/relay/form";
import { ID_BOUNDS } from "@/lib/validation";
import { cn } from "@/lib/utils";

/**
 * Pilih titik lokasi site di peta Indonesia.
 * - ketik alamat/nama tempat → hasil (OpenStreetMap, lewat /api/geocode) → titik langsung tampil di peta
 * - klik peta / seret pin untuk menggeser titik; lingkaran = radius check-in
 * - alamat kosong → diisi otomatis dari titik; kalau sudah terisi, ditawarkan saja (tidak menimpa)
 * Peta dasar OpenStreetMap; di mode gelap digelapkan lewat CSS. Leaflet dimuat hanya di browser.
 */
type Patch = { lat?: number; lng?: number; address?: string };
type Hit = { name: string; address: string; lat: number; lng: number };

// Peta dasar OpenStreetMap (tanpa API key). Mode gelap: tile digelapkan lewat CSS (.dark .relay-map .leaflet-tile-pane).
const TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const INDONESIA: [number, number] = [-2.5, 118];
const valid = (lat: unknown, lng: unknown) => typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);

export function LocationPicker({
  lat,
  lng,
  radius,
  address,
  onChange,
  invalid,
}: {
  lat: number | null;
  lng: number | null;
  radius: number;
  address: string;
  onChange: (p: Patch) => void;
  invalid?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const tiles = useRef<TileLayer | null>(null);
  const marker = useRef<Marker | null>(null);
  const circle = useRef<Circle | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const latest = useRef({ onChange, address, radius });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    latest.current = { onChange, address, radius };
  });

  /** Set titik; `fly` = pindahkan peta ke titik (hasil cari / lokasi saya). */
  const place = async (la: number, ln: number, opts: { fly?: boolean; address?: string } = {}) => {
    const patch: Patch = { lat: +la.toFixed(6), lng: +ln.toFixed(6) };
    if (opts.address && !latest.current.address.trim()) patch.address = opts.address;
    latest.current.onChange(patch);
    if (opts.fly) map.current?.flyTo([la, ln], 16, { duration: 0.6 });
    setSuggested(null);
    if (opts.address) return;
    // dari klik/geser peta: cari alamatnya
    try {
      const r = await fetch(`/api/geocode?lat=${la}&lng=${ln}`);
      const d = (await r.json()) as { address?: string | null };
      if (!d.address) return;
      if (!latest.current.address.trim()) latest.current.onChange({ address: d.address });
      else setSuggested(d.address);
    } catch {
      /* alamat opsional dari peta: abaikan bila gagal */
    }
  };

  // inisialisasi peta sekali
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const mod = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      L.current = mod;
      const start = valid(lat, lng) ? ([lat!, lng!] as [number, number]) : INDONESIA;
      const m = mod.map(el.current, {
        center: start,
        zoom: valid(lat, lng) ? 16 : 4,
        minZoom: 4,
        maxBounds: mod.latLngBounds([ID_BOUNDS.south - 4, ID_BOUNDS.west - 6], [ID_BOUNDS.north + 4, ID_BOUNDS.east + 6]),
        attributionControl: true,
      });
      m.attributionControl.setPrefix(false);
      tiles.current = mod.tileLayer(TILE, { attribution: ATTR, maxZoom: 19 }).addTo(m);
      m.on("click", (e) => void place(e.latlng.lat, e.latlng.lng));
      map.current = m;
      ro = new ResizeObserver(() => m.invalidateSize());
      ro.observe(el.current);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      ro?.disconnect();
      map.current?.remove();
      map.current = null;
      marker.current = null;
      circle.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // titik & radius → pin + lingkaran
  useEffect(() => {
    const mod = L.current;
    const m = map.current;
    if (!mod || !m || !ready) return;
    if (!valid(lat, lng)) {
      marker.current?.remove();
      circle.current?.remove();
      marker.current = null;
      circle.current = null;
      return;
    }
    const pos: [number, number] = [lat!, lng!];
    if (!marker.current) {
      marker.current = mod
        .marker(pos, { draggable: true, icon: mod.divIcon({ className: "", html: '<span class="relay-pin"></span>', iconSize: [30, 30], iconAnchor: [15, 30] }) })
        .addTo(m)
        .on("dragend", (e) => {
          const p = (e.target as Marker).getLatLng();
          void place(p.lat, p.lng);
        });
      circle.current = mod.circle(pos, { radius: radius || 0, className: "relay-radius", weight: 1.5, fillOpacity: 0.12 }).addTo(m);
    } else {
      marker.current.setLatLng(pos);
      circle.current?.setLatLng(pos);
    }
    circle.current?.setRadius(Math.max(0, Number(radius) || 0));
  }, [lat, lng, radius, ready]);

  function search(q: string) {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) {
      setHits(null);
      setSearchError(null);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
        const d = (await r.json()) as { results?: Hit[]; error?: string };
        if (!r.ok) throw new Error(d.error);
        setHits(d.results ?? []);
      } catch (e) {
        setHits(null);
        setSearchError((e as Error).message || "Pencarian gagal. Coba lagi.");
      } finally {
        setSearching(false);
      }
    }, 450);
  }

  function locateMe() {
    if (!navigator.geolocation) return setSearchError("Perangkat ini tidak mendukung lokasi.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        void place(p.coords.latitude, p.coords.longitude, { fly: true });
      },
      () => {
        setLocating(false);
        setSearchError("Izin lokasi ditolak. Cari alamat atau klik peta.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const has = valid(lat, lng);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1" data-vaul-no-drag>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => search(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            placeholder="Cari alamat atau nama tempat"
            aria-label="Cari alamat di peta"
            className={cn(BOX, "h-11 pl-10 pr-9")}
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {hits && query.trim().length >= 3 && (
            <ul className="absolute inset-x-0 top-[calc(100%+6px)] z-[1000] max-h-64 overflow-y-auto rounded-xl border bg-popover p-1 shadow-[var(--shadow-pop)]">
              {hits.length ? (
                hits.map((h) => (
                  <li key={`${h.lat},${h.lng}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setHits(null);
                        setQuery(h.name);
                        void place(h.lat, h.lng, { fly: true, address: h.address });
                      }}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-foreground/[0.05]"
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium">{h.name}</span>
                        <span className="line-clamp-2 text-[12px] text-muted-foreground">{h.address}</span>
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-3 text-center text-[12.5px] text-muted-foreground">Tidak ditemukan. Coba nama jalan, kelurahan, atau klik langsung di peta.</li>
              )}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="press flex h-11 shrink-0 items-center gap-1.5 rounded-xl border bg-card px-3 text-[13px] font-medium transition-colors hover:bg-foreground/[0.04] disabled:opacity-60"
        >
          {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
          <span className="hidden sm:inline">Lokasi saya</span>
        </button>
      </div>
      {searchError && <p className="text-[12.5px] text-amber-700 dark:text-amber-400">{searchError}</p>}

      <div
        data-vaul-no-drag
        className={cn("relay-map relative isolate h-64 overflow-hidden rounded-xl border bg-foreground/[0.03] sm:h-72", invalid && "border-red-500/70")}
      >
        <div ref={el} className="size-full" aria-label="Peta lokasi. Klik untuk menaruh titik." />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-[12.5px] text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Memuat peta…
          </div>
        )}
        {ready && !has && (
          <p className="pointer-events-none absolute inset-x-3 top-3 z-[500] rounded-lg bg-background/90 px-3 py-2 text-center text-[12.5px] shadow-sm backdrop-blur">Klik peta untuk menaruh titik, atau cari alamat di atas.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
        <span className="tabular font-mono">{has ? `${lat!.toFixed(6)}, ${lng!.toFixed(6)}` : "Titik belum dipilih"}</span>
        {has && (
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-primary hover:underline">
            Cek di Google Maps <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      {suggested && (
        <div className="flex items-start gap-2 rounded-xl bg-foreground/[0.035] px-3 py-2.5 text-[12.5px]">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 text-muted-foreground">
            Alamat di titik ini: <span className="text-foreground">{suggested}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              latest.current.onChange({ address: suggested });
              setSuggested(null);
            }}
            className="shrink-0 font-medium text-primary hover:underline"
          >
            Pakai
          </button>
        </div>
      )}
    </div>
  );
}

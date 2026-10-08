import { getCurrentUser } from "@/server/auth";

/**
 * Cari alamat ↔ titik lokasi untuk form Lokasi (Master data), lewat OpenStreetMap Nominatim.
 * Lewat server (bukan langsung dari browser) supaya: hanya admin/supervisor yang bisa memakai,
 * User-Agent sesuai kebijakan Nominatim, maks. 1 permintaan/detik, dan hasil di-cache.
 * GET ?q=alamat → { results: [{ name, address, lat, lng }] }   ·   GET ?lat=&lng= → { address }
 */
const BASE = "https://nominatim.openstreetmap.org";
const UA = "Relay-FieldOps/0.1 (internal demo)";
const cache = new Map<string, unknown>();
let last = 0;

async function nominatim(path: string) {
  if (cache.has(path)) return cache.get(path);
  const wait = 1000 - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(`${BASE}${path}`, { headers: { "User-Agent": UA, "Accept-Language": "id" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const data = await res.json();
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(path, data);
  return data;
}

type Hit = { display_name: string; name?: string; lat: string; lon: string };

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role === "technician") return Response.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  try {
    if (q) {
      if (q.length < 3) return Response.json({ results: [] });
      const hits = (await nominatim(`/search?format=jsonv2&countrycodes=id&limit=5&q=${encodeURIComponent(q.slice(0, 120))}`)) as Hit[];
      return Response.json({ results: hits.map((h) => ({ name: h.name || h.display_name.split(",")[0], address: h.display_name, lat: Number(h.lat), lng: Number(h.lon) })) });
    }
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const hit = (await nominatim(`/reverse?format=jsonv2&zoom=18&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}`)) as Hit | { error: string };
      return Response.json({ address: "display_name" in hit ? hit.display_name : null });
    }
    return Response.json({ error: "q atau lat/lng wajib" }, { status: 400 });
  } catch {
    return Response.json({ error: "Layanan peta sedang tidak bisa dihubungi. Coba lagi sebentar." }, { status: 502 });
  }
}

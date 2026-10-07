/** Logo Relay: dua titik yang terhubung (estafet) di atas latar biru. */
export function BrandMark({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const pad = maskable ? size * 0.2 : size * 0.12;
  const inner = size - pad * 2;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#2563eb", borderRadius: maskable ? 0 : size * 0.22 }}>
      <svg width={inner} height={inner} viewBox="0 0 64 64">
        <path d="M18 44 C 18 26, 46 38, 46 20" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="18" cy="44" r="7" fill="white" />
        <circle cx="46" cy="20" r="7" fill="white" opacity="0.85" />
      </svg>
    </div>
  );
}

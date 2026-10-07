import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sembunyikan lingkaran "N" (indikator dev Next.js) supaya tidak membingungkan saat demo
  devIndicators: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Folder migrasi dibaca saat runtime → pastikan ikut ter-bundle di Vercel
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  experimental: {
    authInterrupts: true,
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;

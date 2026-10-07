import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { THEME_SCRIPT } from "@/components/shell/theme";
import { PwaRegister } from "@/components/shell/pwa";
import { AlertProvider } from "@/components/relay/alert";
import "./globals.css";

/**
 * Tipografi Relay:
 * - Plus Jakarta Sans — dirancang untuk identitas kota Jakarta; geometris-humanis, hangat, sangat terbaca di HP.
 * - JetBrains Mono — untuk kode task & angka teknis (TS-2610-0004, -22 dBm).
 */
const sans = Plus_Jakarta_Sans({ variable: "--font-sans-family", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono-family", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Relay", template: "%s · Relay" },
  description: "Field Operations Task Management",
  applicationName: "Relay",
  appleWebApp: { capable: true, title: "Relay", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans">
        <AlertProvider>{children}</AlertProvider>
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}

import { notFound } from "next/navigation";
import { ErrorScreen, HomeLink } from "@/components/relay/error-screen";
import { ERRORS, isErrorCode } from "@/lib/errors";

/** Halaman status per kode, mis. /status/503 (dipakai untuk maintenance, redirect dari API, dan katalog error). */
export function generateStaticParams() {
  return Object.keys(ERRORS).map((code) => ({ code }));
}

export async function generateMetadata({ params }: PageProps<"/status/[code]">) {
  const { code } = await params;
  const n = Number(code);
  return { title: isErrorCode(n) ? `${n} · ${ERRORS[n].title}` : "Status" };
}

export default async function StatusPage({ params }: PageProps<"/status/[code]">) {
  const { code } = await params;
  const n = Number(code);
  if (!isErrorCode(n)) notFound();
  return <ErrorScreen code={n} actions={n === 401 ? <HomeLink href="/login" label="Masuk" /> : <HomeLink />} />;
}

import { ErrorScreen, HomeLink } from "@/components/relay/error-screen";

export const metadata = { title: "404 · Tidak ditemukan" };

export default function NotFound() {
  return (
    <ErrorScreen
      code={404}
      actions={
        <>
          <HomeLink />
          <HomeLink href="/tasks" label="Lihat tugas" variant="outline" />
        </>
      }
    />
  );
}

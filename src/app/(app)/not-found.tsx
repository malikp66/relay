import { ErrorScreen, HomeLink } from "@/components/relay/error-screen";

export default function AppNotFound() {
  return <ErrorScreen compact code={404} description="Data yang kamu cari tidak ada atau sudah dihapus." actions={<><HomeLink /><HomeLink href="/tasks" label="Lihat tugas" variant="outline" /></>} />;
}

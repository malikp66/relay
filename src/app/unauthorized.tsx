import { ErrorScreen, HomeLink } from "@/components/relay/error-screen";

export default function Unauthorized() {
  return <ErrorScreen code={401} actions={<HomeLink href="/login" label="Masuk" />} />;
}

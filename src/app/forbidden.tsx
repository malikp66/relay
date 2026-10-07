import { ErrorScreen, HomeLink } from "@/components/relay/error-screen";

export default function Forbidden() {
  return <ErrorScreen code={403} actions={<HomeLink />} />;
}

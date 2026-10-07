import { ErrorScreen, HomeLink } from "@/components/relay/error-screen";

export default function AppForbidden() {
  return <ErrorScreen compact code={403} actions={<HomeLink />} />;
}

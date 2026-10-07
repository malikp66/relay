"use client";

import { ErrorBoundaryView } from "@/components/relay/error-boundary-view";

export default function AppError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorBoundaryView {...props} compact />;
}

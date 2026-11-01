"use client";

import dynamic from "next/dynamic";

/** The Mock Tests page loads in its own bundle, in the browser only (it reads device storage). */
const MockTestsPage = dynamic(() => import("@/components/mock/MockTestsPage"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />,
});

export function MockTestsLoader({ linked }: { linked?: string }) {
  return <MockTestsPage linked={linked} />;
}

import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { UsagePanel } from "@/components/UsagePanel";

export const metadata: Metadata = { title: "Usage (dev)", robots: { index: false } };

export default function UsagePage() {
  return (
    <Container className="flex flex-col gap-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Firestore usage</h1>
      <p className="text-muted">Developer page: how much of the free quota Prism is using.</p>
      <UsagePanel />
    </Container>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { ApiKeys } from "@/components/settings/ApiKeys";
import { FLAGS } from "@/lib/flags";

export const metadata: Metadata = { title: "Your API keys" };

export default function KeysPage() {
  if (!FLAGS.byoKey) notFound();
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your API keys</h1>
        <p className="mt-2 max-w-2xl text-muted">
          When many students use Prism at once, the shared free key can run out. Use your own key
          and your lessons never wait on it.
        </p>
      </div>
      <ApiKeys />
    </Container>
  );
}

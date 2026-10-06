import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { ApiKeys } from "@/components/settings/ApiKeys";
import { KeyInstructions } from "@/components/settings/KeyInstructions";
import { FLAGS } from "@/lib/flags";

export const metadata: Metadata = { title: "Your API keys" };

export default function KeysPage() {
  if (!FLAGS.byoKey) notFound();
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">Add your API key</h1>
      <KeyInstructions />
      <ApiKeys />
    </Container>
  );
}

import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { MockTestsLoader } from "@/components/mock/MockTestsLoader";

export const metadata: Metadata = { title: "Mock tests" };

/**
 * Mock Tests (mock test overhaul): one subject at a time, the whole subject, some units or some
 * topics, in your university's own paper pattern. `?subject=` opens with that subject chosen.
 */
export default async function MockTestPage({ searchParams }: PageProps<"/mock-test">) {
  const { subject } = await searchParams;
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mock tests</h1>
        <p className="mt-2 text-muted">
          A timed exam-style paper on one subject: the whole subject, some units or a few topics.
          Write your answers on paper, then mark them with the answer sheet.
        </p>
      </div>
      <MockTestsLoader linked={typeof subject === "string" ? subject.slice(0, 80) : undefined} />
    </Container>
  );
}

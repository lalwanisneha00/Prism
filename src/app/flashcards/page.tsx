import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import { Container } from "@/components/Container";
import { FlashcardReview } from "@/components/flashcards/FlashcardReview";

export const metadata: Metadata = { title: "Flashcards" };

export default function FlashcardsPage() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
        <p className="mt-2 text-muted">
          Spaced repetition: cards you know come back less often, cards you forget come back soon. A
          few minutes a day beats a night of cramming.
        </p>
      </div>
      <FlashcardReview />
    </Container>
  );
}

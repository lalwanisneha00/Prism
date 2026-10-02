import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { AllNotes } from "@/components/annotations/AllNotes";

export const metadata: Metadata = { title: "My Notes" };

export default function MyNotesPage() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Notes</h1>
        <p className="mt-2 text-muted">
          Every highlight and comment you made in your lessons. Private to you, synced across your
          devices when you&apos;re signed in. Tap one to jump straight to it.
        </p>
      </div>
      <AllNotes />
    </Container>
  );
}

import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { NotesManager } from "@/components/notes/NotesManager";

export const metadata: Metadata = { title: "My notes" };

export default function NotesPage() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My notes</h1>
        <p className="mt-2 text-muted">
          Add your college notes and Prism will follow them: same order, same notation, with “📒
          From your notes” on the parts that use them.
        </p>
      </div>
      <NotesManager />
    </Container>
  );
}

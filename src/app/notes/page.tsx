import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { MaterialsManager } from "@/components/notes/MaterialsManager";

export const metadata: Metadata = { title: "My materials" };

export default async function NotesPage({ searchParams }: PageProps<"/notes">) {
  const { subject } = await searchParams;
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My materials</h1>
        <p className="mt-2 text-muted">
          Add your college notes, slides and previous-year papers, and Prism will follow them: same
          order, same notation, with “From your notes” on the parts that use them.
        </p>
      </div>
      <MaterialsManager initialSubject={typeof subject === "string" ? subject : ""} />
    </Container>
  );
}

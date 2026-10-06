import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { SubjectsHub } from "@/components/subjects/SubjectsHub";

export const metadata: Metadata = { title: "Subjects" };

/** My subjects: branch and semester, the syllabus upload, personal cards, everything else collapsed. */
export default function SubjectsPage() {
  return (
    <Container className="flex flex-col gap-8 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
        <p className="mt-2 text-muted">
          Choose your branch and semester. Upload your official syllabus and Prism shows what your
          course covers. Your choices are saved, and synced when you sign in.
        </p>
      </div>
      <SubjectsHub />
    </Container>
  );
}

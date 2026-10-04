import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { MySubjectsList, OtherSubjectsStart } from "@/components/custom/MySubjects";
import { GlobalSearch } from "@/components/subjects/GlobalSearch";
import { SubjectCatalogue } from "@/components/subjects/SubjectCatalogue";

export const metadata: Metadata = { title: "Subjects" };

/** Branch → semester → subject (V3 · Step 3). */
export default function SubjectsPage() {
  return (
    <Container className="flex flex-col gap-8 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
        <p className="mt-2 text-muted">
          Choose your branch and semester to see your subjects first. Your choice is saved (and
          synced when you sign in).
        </p>
      </div>
      <GlobalSearch />
      <SubjectCatalogue />
      <section aria-labelledby="other-title" className="flex flex-col gap-4">
        <h2 id="other-title" className="text-xl font-semibold">
          Other subjects
        </h2>
        <OtherSubjectsStart />
        <MySubjectsList />
      </section>
    </Container>
  );
}

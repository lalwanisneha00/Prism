import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { MySubjectsList, OtherSubjectsStart } from "@/components/custom/MySubjects";

export const metadata: Metadata = { title: "My subjects" };

/** "Other subjects": the student's own non-core subjects (V3 · Step 4). */
export default function MySubjectsPage() {
  return (
    <Container className="flex flex-col gap-8 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Other subjects</h1>
        <p className="mt-2 text-muted">
          Non-core courses such as Indian Knowledge System, Universal Human Values or English
          Communication: set them up with your own syllabus and material.
        </p>
      </div>
      <OtherSubjectsStart />
      <section aria-labelledby="mine" className="flex flex-col gap-3">
        <h2 id="mine" className="text-xl font-semibold">
          My subjects
        </h2>
        <MySubjectsList />
      </section>
    </Container>
  );
}

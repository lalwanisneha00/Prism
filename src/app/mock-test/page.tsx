import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { CustomMockRoute } from "@/components/custom/CustomRoutes";
import { MultiChapterMock } from "@/components/mock/MultiChapterMock";
import { isCustomId } from "@/lib/custom/customSubject";
import { findSubject, subjects } from "@/lib/subjects";

export const metadata: Metadata = { title: "Mock test" };

/** A mock test across several chapters of a subject (V3 · Step 3). */
export default async function MockTestPage({ searchParams }: PageProps<"/mock-test">) {
  const { subject: raw } = await searchParams;
  if (typeof raw === "string" && isCustomId(raw)) {
    return (
      <Container className="flex flex-col gap-6 py-10 sm:py-14">
        <CustomMockRoute id={raw} />
      </Container>
    );
  }
  const subject = findSubject(typeof raw === "string" ? raw : "") ?? subjects[0];
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mock test: {subject.name}</h1>
        <p className="mt-2 text-muted">
          A timed practice paper across the chapters you choose, written from your studied lessons
          and styled on your uploaded previous-year papers.
        </p>
      </div>
      <nav aria-label="Subjects" className="flex flex-wrap gap-2">
        {subjects.map((s) => (
          <Link
            key={s.id}
            href={`/mock-test?subject=${s.id}`}
            aria-current={s.id === subject.id ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              s.id === subject.id
                ? "border-primary bg-primary-soft text-primary"
                : "border-border hover:bg-surface-2"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </nav>
      <MultiChapterMock key={subject.id} subjectId={subject.id} />
    </Container>
  );
}

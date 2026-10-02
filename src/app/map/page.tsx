import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { SubjectMap } from "@/components/map/SubjectMap";
import { findSubject, subjects } from "@/lib/subjects";

export const metadata: Metadata = { title: "Concept map" };

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const { subject: raw } = await searchParams;
  const subject = findSubject(typeof raw === "string" ? raw : "") ?? subjects[0];

  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Concept map</h1>
        <p className="mt-2 text-muted">
          Every topic and what it builds on. Arrows go from what to learn first to what it unlocks;
          colours show your latest quiz results.
        </p>
      </div>
      <nav aria-label="Subjects" className="flex flex-wrap gap-2">
        {subjects.map((s) => (
          <Link
            key={s.id}
            href={`/map?subject=${s.id}`}
            aria-current={s.id === subject.id ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              s.id === subject.id
                ? "border-primary bg-primary-soft text-primary"
                : "border-border hover:bg-surface-2"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </nav>
      <SubjectMap key={subject.id} subject={subject} />
    </Container>
  );
}

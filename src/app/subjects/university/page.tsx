import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { UniversitySyllabus } from "@/components/university/UniversitySyllabus";

export const metadata: Metadata = { title: "My university syllabus" };

export default function UniversityPage() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <p className="text-sm text-muted">
          <Link href="/subjects" className="underline">
            Subjects
          </Link>{" "}
          › My university syllabus
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">My university syllabus</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Universities differ: some skip a subject, some skip chapters of it, some teach it in
          another semester. Add your official syllabus and Prism shows only what you actually study.
        </p>
      </div>
      <UniversitySyllabus />
    </Container>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import { Container } from "@/components/Container";
import { LessonLoader } from "@/components/lesson/LessonLoader";
import { validateLessonRequest, type LessonRequest } from "@/lib/lessonRequest";

export async function generateMetadata({ searchParams }: PageProps<"/lesson">): Promise<Metadata> {
  const result = validateLessonRequest(await searchParams);
  return { title: result.ok ? result.request.topic.name : "Lesson" };
}

export default async function LessonPage({ searchParams }: PageProps<"/lesson">) {
  const params = await searchParams;
  const result = validateLessonRequest(params);

  return (
    <Container className="py-10 sm:py-14">
      {result.ok ? (
        <LessonContent request={result.request} useNotes={params.notes === "1"} />
      ) : (
        <InvalidRequest problems={Object.values(result.errors)} />
      )}
    </Container>
  );
}

function LessonContent({ request, useNotes }: { request: LessonRequest; useNotes: boolean }) {
  return (
    <div className="flex flex-col gap-10">
      <LessonLoader request={request} useNotes={useNotes} />
      <BackLink>Choose a different topic</BackLink>
    </div>
  );
}

function InvalidRequest({ problems }: { problems: string[] }) {
  return (
    <div role="alert" className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">We couldn&apos;t open that lesson</h1>
      <p className="text-muted">The link is missing something or has a typo:</p>
      <ul className="list-disc space-y-1 pl-5 text-danger">
        {problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <BackLink>Pick a topic</BackLink>
    </div>
  );
}

function BackLink({ children }: { children: string }) {
  return (
    <Link
      href="/#start"
      className="w-fit rounded-full border border-border bg-surface px-5 py-2.5 font-semibold transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      ← {children}
    </Link>
  );
}

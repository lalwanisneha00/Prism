import type { Metadata } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import { Container } from "@/components/Container";
import { LessonView } from "@/components/lesson/LessonView";
import { findSampleLesson } from "@/data/sampleLessons";
import { validateLessonRequest, type LessonRequest } from "@/lib/lessonRequest";

export async function generateMetadata({ searchParams }: PageProps<"/lesson">): Promise<Metadata> {
  const result = validateLessonRequest(await searchParams);
  return { title: result.ok ? result.request.topic.name : "Lesson" };
}

export default async function LessonPage({ searchParams }: PageProps<"/lesson">) {
  const result = validateLessonRequest(await searchParams);

  return (
    <Container className="py-10 sm:py-14">
      {result.ok ? (
        <LessonOrPlaceholder request={result.request} />
      ) : (
        <InvalidRequest problems={Object.values(result.errors)} />
      )}
    </Container>
  );
}

function LessonOrPlaceholder({ request }: { request: LessonRequest }) {
  const sample = findSampleLesson(request.topic.id, request.level.slug);
  if (sample) {
    return (
      <div className="flex flex-col gap-10">
        <LessonView lesson={sample} request={request} />
        <BackLink>Choose a different topic</BackLink>
      </div>
    );
  }
  return <LessonSummary request={request} />;
}

function LessonSummary({ request }: { request: LessonRequest }) {
  const { subject, chapter, topic, level, duration } = request;
  return (
    <article className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted">
          {subject.name} <span aria-hidden="true">›</span> {chapter.name}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {topic.name}
        </h1>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          <li className="rounded-full bg-primary-soft px-3 py-1 font-medium text-primary">
            {level.name}
          </li>
          <li className="rounded-full border border-border bg-surface px-3 py-1">{duration} min</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-surface-2 p-5 sm:p-6">
        <p className="font-semibold">Your lesson will appear here.</p>
        <p className="mt-1 text-sm text-muted">
          {level.style} Lesson building is switched on in an upcoming update.
        </p>
      </div>

      <BackLink>Choose a different topic</BackLink>
    </article>
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

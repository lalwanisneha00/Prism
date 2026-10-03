import type { Metadata } from "next";
import Link from "next/link";
import { ChapterPlanner } from "@/components/chapter/ChapterPlanner";
import { Container } from "@/components/Container";
import { validateChapterRequest } from "@/lib/chapter/request";

export const metadata: Metadata = { title: "Plan a chapter lesson" };

/** The plan for a whole-chapter or several-topic lesson, before it is built (V2.5 · Step 3). */
export default async function ChapterPage({ searchParams }: PageProps<"/chapter">) {
  const result = validateChapterRequest(await searchParams);
  return (
    <Container className="py-10 sm:py-14">
      {result.ok ? (
        <ChapterPlanner
          subjectId={result.request.subject.id}
          chapterId={result.request.chapter.id}
          topicIds={result.request.topics.map((t) => t.id)}
          whole={result.request.whole}
          level={result.request.level.slug}
          levelName={result.request.level.name}
          minutes={result.request.minutes}
          plan={result.request.plan}
          notes={result.request.notes}
        />
      ) : (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
        >
          <h1 className="text-2xl font-bold">That chapter lesson can&apos;t be planned</h1>
          <ul className="list-disc pl-5 text-muted">
            {result.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <Link
            href="/"
            className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg"
          >
            Choose again
          </Link>
        </div>
      )}
    </Container>
  );
}

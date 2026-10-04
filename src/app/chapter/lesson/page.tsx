import type { Metadata } from "next";
import Link from "next/link";
import { ChapterLesson } from "@/components/chapter/ChapterLesson";
import { CustomChapterRoute } from "@/components/custom/CustomRoutes";
import { isCustomId } from "@/lib/custom/customSubject";
import { Container } from "@/components/Container";
import { validateChapterRequest } from "@/lib/chapter/request";

export const metadata: Metadata = { title: "Chapter lesson" };

/** A whole-chapter or several-topic lesson, built topic by topic (V2.5 · Step 4). */
export default async function ChapterLessonPage({ searchParams }: PageProps<"/chapter/lesson">) {
  const params = await searchParams;
  if (typeof params.subject === "string" && isCustomId(params.subject)) {
    return (
      <Container className="py-10 sm:py-14">
        <CustomChapterRoute params={params} page="lesson" />
      </Container>
    );
  }
  const result = validateChapterRequest(params);
  return (
    <Container className="py-10 sm:py-14">
      {result.ok ? (
        <ChapterLesson
          subjectId={result.request.subject.id}
          chapterId={result.request.chapter.id}
          topicIds={result.request.topics.map((t) => t.id)}
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
          <h1 className="text-2xl font-bold">That chapter lesson can&apos;t be opened</h1>
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

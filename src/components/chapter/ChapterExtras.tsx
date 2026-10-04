"use client";

import { ChapterQuiz } from "@/components/chapter/ChapterQuiz";
import { RevisionSheet } from "@/components/lesson/StaticBlocks";
import { MockTestPanel } from "@/components/mock/MockTestPanel";
import type { LevelSlug } from "@/data/levels";
import { mergeRevision, mixedQuiz, type TopicLesson } from "@/lib/chapter/extras";

/**
 * After the last topic: a quiz mixing every topic, one revision sheet with the chapter's
 * formulas, and a timed mock test. All built from the topic lessons already on the page.
 */
export function ChapterExtras({
  subjectId,
  chapterId,
  chapterName,
  level,
  topics,
}: {
  subjectId: string;
  chapterId: string;
  chapterName: string;
  level: LevelSlug;
  topics: TopicLesson[];
}) {
  const sheet = mergeRevision(topics);
  const quiz = mixedQuiz(topics, topics.length > 6 ? 1 : 2);
  return (
    <div className="flex flex-col gap-8">
      {quiz.length > 0 && (
        <section aria-labelledby="chapter-quiz-title" className="flex flex-col gap-4">
          <h2 id="chapter-quiz-title" className="text-2xl font-bold tracking-tight">
            Check yourself: the whole chapter
          </h2>
          <p className="text-sm text-muted">
            Questions from every topic, mixed, as in an exam. Your score for each topic updates your
            weak topics.
          </p>
          <ChapterQuiz questions={quiz} topics={topics} />
        </section>
      )}
      <section
        aria-labelledby="chapter-sheet-title"
        className="flex flex-col gap-4"
        data-testid="chapter-sheet"
      >
        <h2 id="chapter-sheet-title" className="text-2xl font-bold tracking-tight">
          Chapter revision sheet and formulas
        </h2>
        <RevisionSheet
          sheet={{
            formulas: sheet.formulas,
            keyPoints: sheet.keyPoints,
            ...(sheet.mnemonics.length ? { mnemonics: sheet.mnemonics } : {}),
          }}
        />
      </section>
      <section aria-labelledby="chapter-mock-title" className="flex flex-col gap-4">
        <h2 id="chapter-mock-title" className="text-2xl font-bold tracking-tight">
          Chapter mock test
        </h2>
        <MockTestPanel
          subjectId={subjectId}
          chapterId={chapterId}
          chapterName={chapterName}
          level={level}
          topics={topics}
        />
      </section>
    </div>
  );
}

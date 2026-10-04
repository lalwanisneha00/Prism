"use client";

import { useState } from "react";
import { Card } from "@/components/lesson/BlockHeading";
import { QuestionCard, type Attempt } from "@/components/lesson/Quiz";
import { scoresByTopic, type MixedQuestion, type TopicLesson } from "@/lib/chapter/extras";
import { lessonId } from "@/lib/storage/library";
import { recordQuizAttempt } from "@/lib/storage/progress";

/**
 * The chapter quiz: questions from every topic, mixed. When it is finished, each topic's
 * score is saved like a single lesson's quiz, so weak topics and the progress tracker update.
 */
export function ChapterQuiz({
  questions,
  topics,
}: {
  questions: MixedQuestion[];
  topics: TopicLesson[];
}) {
  const [attempts, setAttempts] = useState<Record<number, Attempt>>({});
  const [round, setRound] = useState(0);
  const answered = Object.keys(attempts).length;
  const score = Object.values(attempts).filter((a) => a.correct).length;

  function record(i: number, attempt: Attempt) {
    if (attempts[i]) return;
    const next = { ...attempts, [i]: attempt };
    setAttempts(next);
    if (Object.keys(next).length !== questions.length) return;
    const correct = questions.map((_, k) => Boolean(next[k]?.correct));
    for (const s of scoresByTopic(questions, correct)) {
      const t = topics.find((x) => x.topicId === s.topicId);
      if (!t) continue;
      const meta = t.lesson.meta;
      void recordQuizAttempt({
        lessonId: lessonId(meta),
        subject: meta.subject,
        chapter: meta.chapter,
        topic: meta.topic,
        level: meta.level,
        duration: meta.durationMin,
        title: meta.title,
        score: s.score,
        total: s.total,
      }).catch(() => {
        // Storage unavailable: the score just isn't remembered.
      });
    }
  }

  if (questions.length === 0) return null;
  return (
    <div className="flex flex-col gap-4" data-testid="chapter-quiz">
      {questions.map((q, i) => (
        <div key={`${round}-${i}`} className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted uppercase">{q.topicName}</p>
          <QuestionCard
            question={q.question}
            index={i}
            attempt={attempts[i]}
            onAttempt={(a) => record(i, a)}
          />
        </div>
      ))}
      <Card className="flex flex-wrap items-center justify-between gap-3" aria-live="polite">
        <p className="font-semibold">
          {answered < questions.length
            ? `Answered ${answered} of ${questions.length}`
            : `You scored ${score} out of ${questions.length}${score === questions.length ? " 🎉" : ""}`}
        </p>
        {answered > 0 && (
          <button
            type="button"
            onClick={() => {
              setAttempts({});
              setRound((r) => r + 1);
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            Try again
          </button>
        )}
      </Card>
    </div>
  );
}

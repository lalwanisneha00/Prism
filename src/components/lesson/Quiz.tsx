"use client";

import { useState } from "react";
import { Card } from "@/components/lesson/BlockHeading";
import { Markdown } from "@/components/lesson/Markdown";
import type { Lesson, QuizQuestion } from "@/lib/schema";
import { lessonId } from "@/lib/storage/library";
import { recordQuizAttempt } from "@/lib/storage/progress";

/** What the student did with one question: picked an option, or self-marked a written answer. */
type Attempt = { picked?: string; correct: boolean };

const difficultyStyle: Record<QuizQuestion["difficulty"], string> = {
  easy: "text-success",
  medium: "text-warning",
  hard: "text-danger",
};

export function Quiz({ questions, meta }: { questions: QuizQuestion[]; meta?: Lesson["meta"] }) {
  const [attempts, setAttempts] = useState<Record<number, Attempt>>({});
  // Bumped by "Try again" so every question card starts fresh.
  const [round, setRound] = useState(0);
  const answered = Object.keys(attempts).length;
  const score = Object.values(attempts).filter((a) => a.correct).length;

  function record(i: number, attempt: Attempt) {
    if (attempts[i]) return;
    const next = { ...attempts, [i]: attempt };
    setAttempts(next);
    // A finished quiz is saved (and synced) so the dashboard can spot weak topics.
    if (meta && Object.keys(next).length === questions.length) {
      void recordQuizAttempt({
        lessonId: lessonId(meta),
        subject: meta.subject,
        chapter: meta.chapter,
        topic: meta.topic,
        level: meta.level,
        duration: meta.durationMin,
        title: meta.title,
        score: Object.values(next).filter((a) => a.correct).length,
        total: questions.length,
      }).catch(() => {
        // Storage unavailable: the score just isn't remembered.
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, i) => (
        <QuestionCard
          key={`${round}-${i}`}
          question={q}
          index={i}
          attempt={attempts[i]}
          onAttempt={(a) => record(i, a)}
        />
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
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Try again
          </button>
        )}
      </Card>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  attempt,
  onAttempt,
}: {
  question: QuizQuestion;
  index: number;
  attempt?: Attempt;
  onAttempt: (a: Attempt) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const isChoice = Boolean(question.options);
  const showAnswer = isChoice ? Boolean(attempt) : revealed;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-primary">Question {index + 1}</p>
        <p className={`text-xs font-semibold uppercase ${difficultyStyle[question.difficulty]}`}>
          {question.difficulty}
        </p>
      </div>
      <Markdown className="font-medium">{question.question}</Markdown>

      {question.options ? (
        <ul className="grid gap-2">
          {question.options.map((option) => {
            const isAnswer = option === question.answer;
            const isPicked = attempt?.picked === option;
            const state = !attempt
              ? "border-border hover:bg-surface-2"
              : isAnswer
                ? "border-success bg-success/10"
                : isPicked
                  ? "border-danger bg-danger/10"
                  : "border-border opacity-60";
            return (
              <li key={option}>
                <button
                  type="button"
                  disabled={Boolean(attempt)}
                  onClick={() => onAttempt({ picked: option, correct: isAnswer })}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default ${state}`}
                >
                  <Markdown className="min-w-0 flex-1">{option}</Markdown>
                  {attempt && isAnswer && <span aria-label="correct answer">✓</span>}
                  {attempt && isPicked && !isAnswer && <span aria-label="your answer">✗</span>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        !revealed && (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-fit rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Think first, then show the answer
          </button>
        )
      )}

      {showAnswer && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3" aria-live="polite">
          {attempt?.picked !== undefined && (
            <p className={`font-semibold ${attempt.correct ? "text-success" : "text-danger"}`}>
              {attempt.correct ? "Correct!" : "Not quite."}
            </p>
          )}
          {!isChoice && (
            <div>
              <p className="text-sm font-semibold">Answer</p>
              <Markdown>{question.answer}</Markdown>
            </div>
          )}
          <Markdown className="text-sm text-muted">{question.explanation}</Markdown>
          {!isChoice && !attempt && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm">Did you get it?</span>
              <button
                type="button"
                onClick={() => onAttempt({ correct: true })}
                className="rounded-full border border-success px-3 py-1 text-sm font-semibold text-success"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => onAttempt({ correct: false })}
                className="rounded-full border border-danger px-3 py-1 text-sm font-semibold text-danger"
              >
                Not yet
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

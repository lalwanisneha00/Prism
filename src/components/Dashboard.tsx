"use client";

import { DashboardChapterCards } from "@/components/chapter/DashboardChapterCards";
import { ChapterProgressBars, TodayAndStreak } from "@/components/planner/ProgressTracker";
import { annotationHref, confusedTopics, listAllAnnotations } from "@/lib/annotations/store";
import type { Annotation } from "@/lib/storage/db";
import { dueCards, listCards } from "@/lib/flashcards/cards";
import type { Flashcard } from "@/lib/storage/db";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { findLevel } from "@/data/levels";
import { formatClock } from "@/lib/audio/timeline";
import type { AudioPosition, QuizAttempt, RecentTopic } from "@/lib/storage/db";
import { listRecent } from "@/lib/storage/library";
import { listAudioPositions, listQuizAttempts, weakTopics } from "@/lib/storage/progress";

type Data = {
  recent: RecentTopic[];
  positions: AudioPosition[];
  attempts: QuizAttempt[];
  cards: Flashcard[];
  notes: Annotation[];
};

const lessonHref = (t: {
  subject: string;
  chapter: string;
  topic: string;
  level: string;
  duration: number;
}) =>
  `/lesson?${new URLSearchParams({ subject: t.subject, chapter: t.chapter, topic: t.topic, level: t.level, duration: String(t.duration) })}`;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
      aria-label={title}
    >
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-muted">{children}</p>
);

function FlashcardsDue({ cards }: { cards: Flashcard[] }) {
  // Read the clock once when the dashboard opens.
  const [now] = useState(() => Date.now());
  if (cards.length === 0) {
    return (
      <Empty>
        No cards yet. Open a lesson and press <b>🃏 Flashcards</b>.
      </Empty>
    );
  }
  const due = dueCards(cards, now).length;
  return (
    <Link
      href="/flashcards"
      className="flex items-center justify-between gap-3 rounded-xl bg-primary-soft p-4 hover:opacity-90"
    >
      <span>
        <span className="text-2xl font-bold">{due}</span>{" "}
        <span className="text-sm">due now · {cards.length} cards in total</span>
      </span>
      <span className="font-semibold text-primary">{due ? "Review →" : "All caught up ✓"}</span>
    </Link>
  );
}

/** "My study dashboard" (SPEC §9.7), built from this device's copy of the student's data. */
export function Dashboard() {
  const { status, user, signIn, dataVersion } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([
      listRecent(20),
      listAudioPositions(),
      listQuizAttempts(),
      listCards(),
      listAllAnnotations(),
    ])
      .then(([recent, positions, attempts, cards, notes]) =>
        setData({ recent, positions, attempts, cards, notes }),
      )
      .catch(() => setFailed(true));
  }, [dataVersion]);

  if (failed)
    return <Empty>This browser is blocking storage, so there&apos;s nothing to show yet.</Empty>;
  if (!data)
    return <div className="h-48 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;

  const last = data.recent[0];
  const lastAudio =
    last && data.positions.find((p) => p.id.startsWith(`${last.subject}:${last.topic}:`));
  const weak = weakTopics(data.attempts);
  const confused = confusedTopics(data.notes).filter((c) => !weak.some((w) => w.topic === c.topic));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted">
        {user
          ? `Welcome back, ${user.displayName?.split(" ")[0] ?? "there"}.`
          : "Your progress on this device."}
        {status === "signed-out" && (
          <>
            {" "}
            <button
              type="button"
              onClick={signIn}
              className="font-semibold text-primary underline underline-offset-2"
            >
              Sign in
            </button>{" "}
            to keep it in sync across your devices.
          </>
        )}
      </p>

      <TodayAndStreak />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Continue where you left off">
          {last ? (
            <Link
              href={lessonHref(last)}
              className="flex flex-col rounded-xl bg-primary-soft p-4 hover:opacity-90"
            >
              <span className="font-semibold">{last.title}</span>
              <span className="text-sm text-muted">
                {last.chapterName} · {findLevel(last.level)?.name ?? last.level} · {last.duration}{" "}
                min
              </span>
              {lastAudio && (
                <span className="mt-1 text-sm">
                  🎧 Audio stopped at {formatClock(lastAudio.seconds)}
                </span>
              )}
            </Link>
          ) : (
            <Empty>
              Nothing yet.{" "}
              <Link href="/#start" className="font-semibold text-primary underline">
                Start a lesson
              </Link>
              .
            </Empty>
          )}
        </Card>

        <Card title="Weak topics to revise">
          {confused.length > 0 && (
            <ul className="mb-3 flex flex-col gap-2">
              {confused.slice(0, 5).map((c) => (
                <li key={c.topic}>
                  <Link
                    href={annotationHref(c.latest)}
                    className="flex justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-2"
                  >
                    <span className="font-medium">{c.title}</span>
                    <span className="text-danger">{c.count} marked “didn&apos;t understand”</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {weak.length ? (
            <ul className="flex flex-col gap-2">
              {weak.slice(0, 5).map((a) => (
                <li key={a.topic}>
                  <Link
                    href={lessonHref({ ...a, level: "second-chance" })}
                    className="flex justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-2"
                  >
                    <span className="font-medium">{a.title}</span>
                    <span className="text-danger">
                      {a.score}/{a.total}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              {confused.length
                ? "Open one above: each “didn't understand” highlight has an “Explain this simpler” button."
                : data.attempts.length
                  ? "No weak topics: every latest quiz score is 60% or more. 🎉"
                  : "Finish a lesson quiz and topics you found hard will appear here."}
            </Empty>
          )}
        </Card>

        <Card title="Recent quiz scores">
          {data.attempts.length ? (
            <ul className="flex flex-col gap-1 text-sm">
              {data.attempts.slice(0, 5).map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span>
                    {a.title}{" "}
                    <span className="text-muted">· {findLevel(a.level)?.name ?? a.level}</span>
                  </span>
                  <span className="font-semibold">
                    {a.score}/{a.total}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No quizzes finished yet.</Empty>
          )}
        </Card>

        <Card title="Flashcards due today">
          <FlashcardsDue cards={data.cards} />
        </Card>

        <Card title="Chapter progress">
          <ChapterProgressBars />
        </Card>

        <DashboardChapterCards Card={Card} />
      </div>
    </div>
  );
}

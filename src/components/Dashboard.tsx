"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { findLevel } from "@/data/levels";
import { formatClock } from "@/lib/audio/timeline";
import type { AudioPosition, QuizAttempt, RecentTopic } from "@/lib/storage/db";
import { listRecent } from "@/lib/storage/library";
import { listAudioPositions, listQuizAttempts, weakTopics } from "@/lib/storage/progress";

type Data = { recent: RecentTopic[]; positions: AudioPosition[]; attempts: QuizAttempt[] };

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

/** "My study dashboard" (SPEC §9.7), built from this device's copy of the student's data. */
export function Dashboard() {
  const { status, user, signIn, dataVersion } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([listRecent(20), listAudioPositions(), listQuizAttempts()])
      .then(([recent, positions, attempts]) => setData({ recent, positions, attempts }))
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
              {data.attempts.length
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
          <Empty>
            Flashcards are coming soon: lessons you study now will be ready to turn into cards.
          </Empty>
        </Card>

        <Card title="Recent mock test scores">
          <Empty>Mock tests from past papers are coming in a later update.</Empty>
        </Card>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { predictionNote } from "@/lib/priority/predict";
import { loadStudyModel, type StudyModel } from "@/lib/priority/model";
import { subjects } from "@/lib/subjects";

type CardType = ComponentType<{ title: string; children: ReactNode }>;

/** Where a "subject/topic" key lives in the syllabus: names and a lesson link. */
function locate(key: string, level: string) {
  const slash = key.indexOf("/");
  const subject = subjects.find((s) => s.id === key.slice(0, slash));
  const topicId = key.slice(slash + 1);
  const chapter = subject?.chapters.find((c) => c.topics.some((t) => t.id === topicId));
  const topic = chapter?.topics.find((t) => t.id === topicId);
  if (!subject || !chapter || !topic) return null;
  const href = `/lesson?${new URLSearchParams({ subject: subject.id, chapter: chapter.id, topic: topic.id, level, duration: "15" })}`;
  return { subject: subject.name, name: topic.name, href };
}

/** "My weak areas" and "May need extra time" from the priority engine (V3 · Step 11). */
export function StudyInsights({ Card }: { Card: CardType }) {
  const dataVersion = useDataVersion();
  const [model, setModel] = useState<StudyModel | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadStudyModel(subjects)
      .then(setModel)
      .catch(() => setFailed(true));
  }, [dataVersion]);

  if (failed) return null;
  if (!model)
    return <div className="h-32 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;

  const weak = [...model.weakness]
    .filter(([, w]) => w.weak)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 6);
  const tough = [...model.predictions.values()].slice(0, 6);

  return (
    <>
      <Card title="My weak areas">
        {weak.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing flagged. Prism looks at quiz and mock scores, wrong answers and
            &ldquo;didn&apos;t understand&rdquo; marks, never a single tap.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {weak.map(([key, w]) => {
              const at = locate(key, "second-chance");
              if (!at) return null;
              return (
                <li key={key}>
                  <Link
                    href={at.href}
                    className="flex flex-col rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-2"
                  >
                    <span className="font-medium">{at.name}</span>
                    <span className="text-xs text-muted">
                      {at.subject} · {w.reasons[0] ?? "needs another look"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card title="May need extra time">
        {tough.length === 0 ? (
          <p className="text-sm text-muted">
            No topic looks tougher than usual yet. This appears when a topic builds on one you found
            hard.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tough.map((p) => {
              const at = locate(p.key, "building-blocks");
              if (!at) return null;
              return (
                <li key={p.key}>
                  <Link
                    href={at.href}
                    className="flex flex-col rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-2"
                  >
                    <span className="font-medium">{at.name}</span>
                    <span className="text-xs text-muted">{predictionNote(p)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

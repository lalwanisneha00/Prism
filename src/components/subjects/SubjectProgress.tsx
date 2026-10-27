"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChapterFlag } from "@/components/flags/ChapterFlag";
import { TopicFlag } from "@/components/flags/TopicFlag";
import { BadgeView, named } from "@/components/subjects/TrustBadge";
import { useSyllabusOverlay } from "@/components/subjects/useSyllabusOverlay";
import { ScopeNotice } from "@/components/university/ScopeNotice";
import { useScopedSubjects } from "@/components/university/useUniversityScope";
import { useTopicStatuses } from "@/components/map/useTopicStatuses";
import type { TopicStatus } from "@/lib/conceptMap";
import { listQuizAttempts, weakTopics } from "@/lib/storage/progress";
import type { QuizAttempt } from "@/lib/storage/db";
import { paperStats } from "@/lib/chapter/estimate";
import { sectionText } from "@/lib/extract/types";
import { listLocalNotes } from "@/lib/notes/store";
import { chaptersOf, findSubject, type Chapter, type Subject } from "@/lib/subjects";
import { badgeFor, chapterBadgeWanted, liveSupport, type Badge } from "@/lib/syllabusFix/badges";
import type { Overlay } from "@/lib/syllabusFix/overlay";
import { resolveMeta } from "@/lib/syllabusFix/tree";

const dot: Record<TopicStatus, string> = {
  mastered: "bg-success",
  weak: "bg-danger",
  tried: "bg-warning",
  new: "bg-border",
};

/** The course as Prism has it (not narrowed to the student's uploaded syllabus), for flags. */
const flagOwner = (owner: Subject) => findSubject(owner.id) ?? owner;

/** A chapter's own trust badge (Phase 7), or null when the course's badge already says it. */
function chapterBadge(overlay: Overlay, owner: Subject, chapter: Chapter): Badge | null {
  const course = badgeFor(resolveMeta(owner), named(liveSupport(overlay, owner.id)));
  const own = badgeFor(
    resolveMeta(owner, chapter),
    named(liveSupport(overlay, owner.id, chapter.id)),
  );
  return chapterBadgeWanted(course, own) ? own : null;
}

/** A chapter's topic chips; on the course page they fold away (the first chapter starts open). */
function TopicList({
  collapsible,
  open,
  count,
  children,
}: {
  collapsible: boolean;
  open: boolean;
  count: number;
  children: ReactNode;
}) {
  const list = <ul className="mt-3 flex flex-wrap gap-2 text-sm">{children}</ul>;
  if (!collapsible) return list;
  return (
    <details open={open} className="group mt-2">
      <summary className="w-fit cursor-pointer text-sm font-semibold text-primary">
        {count} topic{count === 1 ? "" : "s"}
      </summary>
      {list}
    </details>
  );
}

/** A subject's chapters with the student's progress, and its weak topics. */
export function SubjectProgress({
  subjectId,
  subject: given,
  collapsible = false,
}: {
  subjectId: string;
  subject?: Subject;
  /** The course page: units fold away, and every topic gets a flag. */
  collapsible?: boolean;
}) {
  const base = given ?? findSubject(subjectId)!;
  const practical = base.courseType === "practical";
  const flags = collapsible && base.university === "pdeu";
  const baseList = useMemo(() => [base], [base]);
  const scoped = useScopedSubjects(baseList);
  const subject = scoped.subjects[0];
  const statuses = useTopicStatuses();
  const overlay = useSyllabusOverlay();
  const [weak, setWeak] = useState<QuizAttempt[]>([]);
  // How often each topic comes up in the student's previous-year papers (exam emphasis).
  const [asked, setAsked] = useState<{ papers: number; hits: Record<string, number> }>({
    papers: 0,
    hits: {},
  });
  useEffect(() => {
    listQuizAttempts()
      .then((all) => setWeak(weakTopics(all).filter((a) => a.subject === subjectId)))
      .catch(() => setWeak([]));
    listLocalNotes()
      .then((notes) => {
        const papers = notes
          .filter((n) => n.kind === "pyq" && n.subject === subjectId && n.sections?.length)
          .map((n) => (n.sections ?? []).map(sectionText).join("\n"));
        if (papers.length === 0) return;
        const topics = subject.chapters.flatMap((c) => c.topics);
        setAsked({
          papers: papers.length,
          hits: paperStats(papers, topics, subject.chapters).topicHits,
        });
      })
      .catch(() => undefined);
  }, [subjectId, subject]);

  const pickHref = (owner: string, chapter: string, topic?: string) =>
    `/start?${new URLSearchParams({ subject: owner, chapter, ...(topic ? { topic } : {}) })}`;

  return (
    <div className="flex flex-col gap-6">
      {scoped.active && (
        <ScopeNotice
          hidden={scoped.hidden}
          name={scoped.name}
          onShowAll={() => scoped.setOff(true)}
        />
      )}
      {weak.length > 0 && (
        <section
          aria-labelledby="weak-title"
          className="rounded-2xl border border-danger/30 bg-danger/5 p-4"
        >
          <h2 id="weak-title" className="font-semibold">
            Weak topics to revise
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {weak.map((a) => (
              <li key={a.topic}>
                <Link
                  href={pickHref(a.subject, a.chapter, a.topic)}
                  className="rounded-full border border-border bg-surface px-3 py-1 hover:bg-surface-2"
                >
                  {a.title} · {a.score}/{a.total}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {asked.papers > 0 && (
        <p className="text-sm text-muted" data-testid="exam-emphasis">
          Topics marked “asked N×” come up in your {asked.papers} uploaded previous-year{" "}
          {asked.papers === 1 ? "paper" : "papers"}: give them extra time.
        </p>
      )}
      <ol className="flex flex-col gap-4" data-testid="subject-chapters">
        {chaptersOf(subject).map(({ chapter, owner }, i) => {
          const s = chapter.topics.map((t) => statuses.get(t.id) ?? "new");
          const mastered = s.filter((x) => x === "mastered").length;
          const badge =
            flags && owner.university === "pdeu" ? chapterBadge(overlay, owner, chapter) : null;
          return (
            <li
              key={`${owner.id}:${chapter.id}`}
              id={`chapter-${chapter.id}`}
              className="scroll-mt-24 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex min-w-0 items-start gap-1">
                  <h2 className="text-lg font-semibold">
                    {i + 1}. {chapter.name}
                    {owner.id !== subject.id && (
                      <span className="text-sm font-normal text-muted"> (from {owner.name})</span>
                    )}
                  </h2>
                  {owner.university === "pdeu" && (
                    <ChapterFlag owner={owner} chapterId={chapter.id} />
                  )}
                </div>
                <p className="text-sm text-muted">
                  {practical
                    ? `${chapter.topics.length} experiment${chapter.topics.length === 1 ? "" : "s"}`
                    : `${mastered} of ${chapter.topics.length} mastered`}
                  {chapter.hours ? ` · ${chapter.hours} syllabus hours` : ""}
                </p>
              </div>
              {badge && (
                <div className="mt-1">
                  <BadgeView badge={badge} size="sm" testId="chapter-badge" />
                </div>
              )}
              {!practical && (
                <progress
                  className="mt-2 h-2 w-full accent-primary"
                  max={chapter.topics.length}
                  value={mastered}
                  aria-label={`${chapter.name} progress`}
                />
              )}
              {practical ? (
                // A lab: its experiments in order (lab lessons arrive in Phase 7B).
                <ol className="mt-3 flex flex-col gap-2 text-sm" data-testid="experiments">
                  {chapter.topics.map((t, k) => (
                    <li key={t.id} className="flex items-start gap-2">
                      <span className="w-6 shrink-0 text-right font-semibold text-muted">
                        {t.number ?? k + 1}.
                      </span>
                      <span className="min-w-0 flex-1">
                        {t.name}
                        {t.aim && <span className="block text-xs text-muted">Aim: {t.aim}</span>}
                      </span>
                      {flags && (
                        <TopicFlag owner={flagOwner(owner)} chapterId={chapter.id} topic={t} />
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <TopicList collapsible={collapsible} open={i === 0} count={chapter.topics.length}>
                  {chapter.topics.map((t, k) => (
                    <li key={t.id} className="flex items-center gap-0.5">
                      <Link
                        href={pickHref(owner.id, chapter.id, t.id)}
                        className="flex items-center gap-2 rounded-full border border-border px-3 py-1 hover:bg-surface-2"
                      >
                        <span aria-hidden="true" className={`size-2 rounded-full ${dot[s[k]]}`} />
                        {t.name}
                        {asked.hits[t.id] ? (
                          <span
                            className="rounded-full bg-warning/15 px-1.5 text-xs font-semibold text-warning"
                            title="Questions on this topic in your previous-year papers"
                          >
                            asked {asked.hits[t.id]}×
                          </span>
                        ) : null}
                      </Link>
                      {flags && (
                        <TopicFlag owner={flagOwner(owner)} chapterId={chapter.id} topic={t} />
                      )}
                    </li>
                  ))}
                </TopicList>
              )}
              {!practical && (
                <Link
                  href={pickHref(owner.id, chapter.id)}
                  className="mt-3 inline-block text-sm font-semibold text-primary underline"
                >
                  Study this chapter →
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

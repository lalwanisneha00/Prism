"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { ChapterLesson } from "@/components/chapter/ChapterLesson";
import { ChapterPlanner } from "@/components/chapter/ChapterPlanner";
import { LessonLoader } from "@/components/lesson/LessonLoader";
import { SubjectGraph } from "@/components/map/SubjectGraph";
import { MultiChapterMock } from "@/components/mock/MultiChapterMock";
import { validateChapterRequest, type RawChapterRequest } from "@/lib/chapter/request";
import type { CustomSubjectPayload } from "@/lib/custom/customSubject";
import { loadCustomSubject } from "@/lib/custom/store";
import { validateLessonRequest, type RawLessonRequest } from "@/lib/lessonRequest";
import type { Subject } from "@/lib/subjects";

/*
 * Pages for a student's own subject (V3 · Step 4). The subject lives in the student's
 * browser (and their account), not on the server, so these pages load it here first and then
 * show exactly the same lesson, chapter plan and chapter lesson as for a built-in subject.
 */

type Loaded = { subject: Subject; payload: CustomSubjectPayload } | null | "loading";

function useCustom(id: string): Loaded {
  const dataVersion = useDataVersion();
  const [loaded, setLoaded] = useState<Loaded>("loading");
  useEffect(() => {
    loadCustomSubject(id)
      .then((r) => setLoaded(r ? { subject: r.subject, payload: r.payload } : null))
      .catch(() => setLoaded(null));
  }, [id, dataVersion]);
  return loaded;
}

function Missing() {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
    >
      <h1 className="text-2xl font-bold">This subject isn&apos;t on this device</h1>
      <p className="text-muted">
        It may have been deleted, or it was made on another device and hasn&apos;t synced yet (sign
        in to sync your subjects).
      </p>
      <Link
        href="/my-subjects"
        className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg"
      >
        My subjects
      </Link>
    </div>
  );
}

function Problems({ problems }: { problems: string[] }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
    >
      <h1 className="text-2xl font-bold">We couldn&apos;t open that</h1>
      <ul className="list-disc pl-5 text-muted">
        {problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <Link
        href="/my-subjects"
        className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg"
      >
        My subjects
      </Link>
    </div>
  );
}

function Skeleton(): ReactNode {
  return <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
}

export function CustomLessonRoute({
  params,
  useNotes,
}: {
  params: RawLessonRequest;
  useNotes: boolean;
}) {
  const id = typeof params.subject === "string" ? params.subject : "";
  const loaded = useCustom(id);
  const key = JSON.stringify(params);
  // One stable request object: the loader fetches again whenever it changes.
  const result = useMemo(
    () => (loaded && loaded !== "loading" ? validateLessonRequest(params, [loaded.subject]) : null),
    // key stands for params (a new object on every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, key],
  );
  if (loaded === "loading") return <Skeleton />;
  if (!loaded || !result) return <Missing />;
  if (!result.ok) return <Problems problems={Object.values(result.errors)} />;
  return <LessonLoader request={result.request} useNotes={useNotes} custom={loaded.payload} />;
}

export function CustomChapterRoute({
  params,
  page,
}: {
  params: RawChapterRequest;
  page: "plan" | "lesson";
}) {
  const id = typeof params.subject === "string" ? params.subject : "";
  const loaded = useCustom(id);
  const key = JSON.stringify(params);
  const result = useMemo(
    () =>
      loaded && loaded !== "loading" ? validateChapterRequest(params, [loaded.subject]) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, key],
  );
  if (loaded === "loading") return <Skeleton />;
  if (!loaded || !result) return <Missing />;
  if (!result.ok) return <Problems problems={result.errors} />;
  const r = result.request;
  return page === "plan" ? (
    <ChapterPlanner
      subject={loaded.subject}
      subjectId={r.subject.id}
      chapterId={r.chapter.id}
      topicIds={r.topics.map((t) => t.id)}
      whole={r.whole}
      level={r.level.slug}
      levelName={r.level.name}
      minutes={r.minutes}
      plan={r.plan}
      notes={r.notes}
    />
  ) : (
    <ChapterLesson
      subject={loaded.subject}
      custom={loaded.payload}
      subjectId={r.subject.id}
      chapterId={r.chapter.id}
      topicIds={r.topics.map((t) => t.id)}
      level={r.level.slug}
      levelName={r.level.name}
      minutes={r.minutes}
      plan={r.plan}
      notes={r.notes}
    />
  );
}

export function CustomMockRoute({ id }: { id: string }) {
  const loaded = useCustom(id);
  if (loaded === "loading") return <Skeleton />;
  if (!loaded) return <Missing />;
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Mock test: {loaded.subject.name}</h1>
      <MultiChapterMock subjectId={id} subject={loaded.subject} custom={loaded.payload} />
    </>
  );
}

export function CustomMapRoute({ id }: { id: string }) {
  const loaded = useCustom(id);
  if (loaded === "loading") return <Skeleton />;
  if (!loaded) return <Missing />;
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Concept map: {loaded.subject.name}</h1>
      <SubjectGraph subject={loaded.subject} />
    </>
  );
}

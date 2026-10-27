"use client";

import { useState } from "react";
import type { AdminLessonFlag } from "@/app/api/admin/syllabus/route";
import type { RunAction } from "@/components/admin/AdminSyllabus";
import { btn, primaryBtn, Row, Section } from "@/components/admin/AdminQueues";
import type { AdminView } from "@/lib/syllabusFix/adminView";
import { LESSON_FLAG_TYPES } from "@/lib/syllabusFix/flags";

/*
 * The admin page's lesson queues (syllabus fix, Phase 6): lessons stuck in review after repeated
 * flags (read the flags, rewrite once more, or mark as fine) and the courses where several
 * lessons keep getting flagged (lesson_quality_warning). Students' words are shown as plain text.
 */

const flagNames = new Map<string, string>(LESSON_FLAG_TYPES.map((t) => [t.type, t.label]));
const flagName = (type: string) => flagNames.get(type) ?? type.replace(/-/g, " ");

export function AdminLessons({
  view,
  busy,
  run,
}: {
  view: AdminView;
  busy: boolean;
  run: RunAction;
}) {
  return (
    <>
      <Section title="Lessons in review" count={view.lessons.length} open={view.lessons.length > 0}>
        <p className="text-sm text-muted">
          Students kept flagging these after Prism already rewrote them, so they stopped rewriting
          on their own. Students see a note that the lesson is being reviewed.
        </p>
        {view.lessons.map((l) => (
          <LessonRow key={l.lessonKey} lesson={l} busy={busy} run={run} />
        ))}
      </Section>

      <Section title="Courses where lessons struggle" count={view.quality.length}>
        <p className="text-sm text-muted">
          Several lessons in these courses were flagged. Nothing changes on its own; this is for you
          to look into.
        </p>
        {view.quality.map((q) => (
          <Row key={q.subject}>
            <p className="font-medium">{q.course}</p>
            <p className="text-muted">
              {q.lessons} flagged lesson{q.lessons === 1 ? "" : "s"}
              {q.chapters.length > 0 && <> · chapters: {q.chapters.join(", ")}</>}
            </p>
          </Row>
        ))}
      </Section>
    </>
  );
}

function LessonRow({
  lesson: l,
  busy,
  run,
}: {
  lesson: AdminView["lessons"][number];
  busy: boolean;
  run: RunAction;
}) {
  const [flags, setFlags] = useState<AdminLessonFlag[] | null>(null);
  const [loading, setLoading] = useState(false);

  const showFlags = async () => {
    setLoading(true);
    try {
      setFlags((await run({ action: "lesson-flags", lessonKey: l.lessonKey })) ?? null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row>
      <p className="font-medium">
        {l.topic} <span className="font-normal text-muted">({l.course})</span>
      </p>
      <p className="text-muted">
        Version {l.version} · {l.flags} flag{l.flags === 1 ? "" : "s"} on this version · rewritten{" "}
        {l.regenerations} time{l.regenerations === 1 ? "" : "s"} · {l.updatedAt.slice(0, 10)}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || loading}
          className={btn}
          aria-expanded={flags !== null}
          onClick={() => (flags ? setFlags(null) : void showFlags())}
        >
          {loading ? "Loading flags..." : flags ? "Hide flags" : "View flags"}
        </button>
        <button
          type="button"
          disabled={busy}
          className={primaryBtn}
          onClick={() => void run({ action: "lesson-regenerate", lessonKey: l.lessonKey })}
        >
          Rewrite it
        </button>
        <button
          type="button"
          disabled={busy}
          className={btn}
          onClick={() => void run({ action: "lesson-fine", lessonKey: l.lessonKey })}
        >
          Mark as fine
        </button>
      </div>
      {flags &&
        (flags.length === 0 ? (
          <p className="text-muted">No flags stored for this version.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {flags.map((f, i) => (
              <li key={`${f.at}-${i}`} className="rounded-lg bg-surface-2 p-2">
                <p className="font-semibold">
                  {flagName(f.type)}{" "}
                  <span className="font-normal text-muted">· {f.at.slice(0, 10)}</span>
                </p>
                {f.excerpt && (
                  <blockquote className="mt-1 border-l-2 border-border pl-2 break-words text-muted">
                    {f.excerpt}
                  </blockquote>
                )}
                {f.note && <p className="mt-1 break-words">{f.note}</p>}
              </li>
            ))}
          </ul>
        ))}
    </Row>
  );
}

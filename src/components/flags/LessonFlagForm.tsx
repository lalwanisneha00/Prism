"use client";

import { useId, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { deviceProfile, postFlag } from "@/components/flags/flagApi";
import { SyllabusFlagForm } from "@/components/flags/SyllabusFlagForm";
import { LESSON_FLAG_TYPES, type LessonFlagType } from "@/lib/syllabusFix/flags";

const btn = "rounded-full border border-border px-4 py-2 font-semibold hover:bg-surface-2";
const primary =
  "rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60";
const field = "rounded-xl border border-border bg-bg px-3 py-2";

export type LessonRef = {
  subject: { id: string; name: string; codes: string[] };
  chapter: { id: string; name: string; topics: readonly { id: string; name: string }[] };
  chapters: readonly {
    id: string;
    name: string;
    topics: readonly { id: string; name: string }[];
  }[];
  topic: string;
  level: string;
  durationMin: number;
  /** Text the student had selected when they opened the report (the part that is wrong). */
  excerpt?: string;
};

/**
 * "Something is wrong in this lesson" (syllabus fix, Phase 4): a lesson flag (wrong fact, formula,
 * visual, …) with the selected part and a note. A link below switches to the topic's syllabus
 * flags (wrong chapter, not in my syllabus). Phase 5 regenerates a lesson that enough students flag.
 */
export function LessonFlagForm({ lesson, onClose }: { lesson: LessonRef; onClose: () => void }) {
  const id = useId();
  const { status, user, signIn } = useAuth();
  const [type, setType] = useState<LessonFlagType | null>(null);
  const [excerpt, setExcerpt] = useState(lesson.excerpt?.slice(0, 600) ?? "");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [syllabus, setSyllabus] = useState(false);

  async function send() {
    setError(null);
    if (!type) return setError("Pick what is wrong.");
    if (!user) return setError("Sign in so your report can be counted (one per student).");
    setSending(true);
    try {
      const token = await user.getIdToken().catch(() => undefined);
      const flag = {
        subject: lesson.subject.id,
        topic: lesson.topic,
        level: lesson.level,
        durationMin: lesson.durationMin,
        type,
        ...(excerpt.trim() ? { excerpt: excerpt.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      const r = await postFlag("/api/lesson/flag", { flag, profile: await deviceProfile() }, token);
      if (!r.ok) return setError(r.message);
      setDone(
        r.replaced
          ? "Thanks! Your earlier report on this lesson is updated."
          : "Thanks! When several students report the same lesson, Prism rewrites it with your notes.",
      );
    } finally {
      setSending(false);
    }
  }

  if (syllabus)
    return (
      <SyllabusFlagForm
        subject={lesson.subject}
        levels={["topic"]}
        chapters={lesson.chapters}
        chapter={lesson.chapter.id}
        topic={lesson.topic}
        onClose={onClose}
      />
    );

  if (done)
    return (
      <div className="flex flex-col gap-3" role="status" data-testid="flag-done">
        <p>{done}</p>
        <button type="button" className={`${btn} w-fit`} onClick={onClose}>
          Close
        </button>
      </div>
    );

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 font-semibold">What is wrong in this lesson?</legend>
        {LESSON_FLAG_TYPES.map((item) => (
          <label key={item.type} className="flex items-center gap-2">
            <input
              type="radio"
              name={`${id}-type`}
              value={item.type}
              checked={type === item.type}
              onChange={() => {
                setType(item.type);
                setError(null);
              }}
            />
            {item.label}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1">
        <span>The part that is wrong (optional)</span>
        <span className="text-xs text-muted">
          Tip: select the text in the lesson before you tap the flag, and it appears here.
        </span>
        <textarea
          className={field}
          rows={3}
          maxLength={600}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>Anything to add? (optional)</span>
        <textarea
          className={field}
          rows={2}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {status === "unavailable" ? (
        <p className="text-muted">Reporting needs sign-in, which is not set up here.</p>
      ) : (
        !user && (
          <button type="button" className={`${btn} w-fit`} onClick={() => void signIn()}>
            Sign in to send it
          </button>
        )
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primary} disabled={sending || !user || !type}>
          {sending ? "Sending…" : "Send report"}
        </button>
        <button type="button" className={btn} onClick={onClose}>
          Cancel
        </button>
      </div>
      <button
        type="button"
        className="w-fit text-left text-primary underline"
        onClick={() => setSyllabus(true)}
      >
        Is the topic itself in the wrong place in the syllabus? Report that instead
      </button>
    </form>
  );
}

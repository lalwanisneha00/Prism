"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { deviceProfile, postFlag, thanksFor, type Profile } from "@/components/flags/flagApi";
import { subjectsInSemester } from "@/lib/catalogue";
import { FLAG_MENU, type FlagLevel, type SyllabusFlagType } from "@/lib/syllabusFix/flags";

const HandoutUpload = dynamic(() => import("@/components/subjects/HandoutUpload"), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-xl bg-surface-2" aria-busy="true" />,
});

const btn = "rounded-full border border-border px-4 py-2 font-semibold hover:bg-surface-2";
const primary =
  "rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60";
const field = "rounded-xl border border-border bg-bg px-3 py-2";

type ChapterLite = { id: string; name: string; topics: readonly { id: string; name: string }[] };

const LEVEL_TITLE: Record<FlagLevel, string> = {
  course: "About this course",
  chapter: "About this chapter",
  topic: "About a topic",
};

/**
 * The flag menu for a course, chapter or topic (syllabus fix, Phase 4): pick what is wrong, answer
 * the one extra question some choices ask, add a note if you like, send. Needs sign-in (one vote
 * per student). Nothing changes for anyone until enough students agree (Phase 5).
 */
export function SyllabusFlagForm({
  subject,
  levels,
  chapters = [],
  chapter,
  topic,
  onClose,
}: {
  subject: { id: string; name: string; codes: string[] };
  levels: FlagLevel[];
  /** The course's chapters and topics (for the "where does it belong" pickers). */
  chapters?: readonly ChapterLite[];
  chapter?: string;
  /** A fixed topic (lesson page); otherwise topic flags ask which topic. */
  topic?: string;
  onClose: () => void;
}) {
  const id = useId();
  const { status, user, signIn } = useAuth();
  const [type, setType] = useState<SyllabusFlagType | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [semester, setSemester] = useState<string>("");
  const [other, setOther] = useState("");
  const [position, setPosition] = useState("");
  const [name, setName] = useState("");
  const [topicPick, setTopicPick] = useState(topic ?? "");
  const [toChapter, setToChapter] = useState("");
  const [note, setNote] = useState("");
  const [upload, setUpload] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    void deviceProfile().then(setProfile);
  }, []);

  const here = chapters.find((c) => c.id === chapter);
  const myCourses =
    profile?.semester && profile.branch
      ? subjectsInSemester(profile.semester, profile.branch).filter((s) => s.id !== subject.id)
      : [];
  const noProfile = profile !== null && (!profile.branch || !profile.semester);

  function request(): Record<string, unknown> | string {
    const base = { subject: subject.id, ...(note.trim() ? { note: note.trim() } : {}) };
    switch (type) {
      case null:
        return "Pick what is wrong.";
      case "course-wrong-semester":
        if (semester === "none") return { ...base, type: "course-not-in-branch" };
        if (!semester) return "Pick the semester it is in.";
        if (Number(semester) === profile?.semester)
          return "Pick a different semester from your own.";
        return { ...base, type, semester: Number(semester) };
      case "course-not-in-branch":
        return { ...base, type };
      case "course-duplicate":
        return { ...base, type, ...(other ? { other } : {}) };
      case "chapter-wrong-course":
        if (!other) return "Pick the course it belongs to.";
        return { ...base, type, chapter, toSubject: other };
      case "chapter-wrong-order":
        if (!position) return "Pick its position.";
        return { ...base, type, chapter, position: Number(position) };
      case "chapter-missing":
      case "topic-missing":
        if (name.trim().length < 2) return "Write its name.";
        return {
          ...base,
          type,
          name: name.trim(),
          ...(type === "topic-missing" ? { chapter } : {}),
        };
      case "topic-wrong-chapter":
        if (!topicPick) return "Pick the topic.";
        if (!toChapter) return "Pick the chapter it belongs to.";
        return { ...base, type, chapter, topic: topicPick, toChapter };
      case "topic-not-in-syllabus":
        if (!topicPick) return "Pick the topic.";
        return { ...base, type, chapter, topic: topicPick };
    }
  }

  async function send() {
    setError(null);
    const flag = request();
    if (typeof flag === "string") return setError(flag);
    if (!user) return setError("Sign in so your report can be counted (one per student).");
    setSending(true);
    try {
      const token = await user.getIdToken().catch(() => undefined);
      const r = await postFlag("/api/syllabus/flag", { flag, profile: profile ?? {} }, token);
      if (!r.ok) return setError(r.message);
      setDone(thanksFor(r));
    } finally {
      setSending(false);
    }
  }

  if (done)
    return (
      <div className="flex flex-col gap-3" role="status" data-testid="flag-done">
        <p>{done}</p>
        <button type="button" className={`${btn} w-fit`} onClick={onClose}>
          Close
        </button>
      </div>
    );

  if (upload)
    return (
      <HandoutUpload
        subjectId={subject.id}
        subjectName={subject.name}
        codes={subject.codes}
        onClose={onClose}
      />
    );

  const topicChoices = here?.topics ?? [];
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {levels.map((level) => (
        <fieldset key={level} className="flex flex-col gap-1.5">
          <legend className="mb-1 font-semibold">{LEVEL_TITLE[level]}</legend>
          {FLAG_MENU[level].map((item) => (
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
      ))}

      {type?.startsWith("course-") && noProfile && (
        <p className="rounded-xl bg-warning/10 px-3 py-2">
          Choose your branch and semester on My subjects first, so we know where you study.
        </p>
      )}

      {type === "course-wrong-semester" && (
        <label className="flex flex-col gap-1">
          <span>Which semester is it in?</span>
          <select
            className={`${field} w-fit`}
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <option value="">Choose…</option>
            {[1, 2, 3, 4, 5, 6, 7, 8]
              .filter((n) => n !== profile?.semester)
              .map((n) => (
                <option key={n} value={n}>
                  Semester {n}
                </option>
              ))}
            <option value="none">Not in my branch at all</option>
          </select>
        </label>
      )}

      {(type === "course-duplicate" || type === "chapter-wrong-course") && (
        <label className="flex flex-col gap-1">
          <span>
            {type === "course-duplicate"
              ? "Which course does it repeat? (optional)"
              : "Which course does it belong to?"}
          </span>
          <select className={field} value={other} onChange={(e) => setOther(e.target.value)}>
            <option value="">{type === "course-duplicate" ? "Not sure" : "Choose…"}</option>
            {myCourses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {myCourses.length === 0 && (
            <span className="text-muted">
              Your semester&apos;s courses show here once your branch and semester are set.
            </span>
          )}
        </label>
      )}

      {type === "chapter-wrong-order" && (
        <label className="flex flex-col gap-1">
          <span>Where should it be?</span>
          <select
            className={`${field} w-fit`}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            <option value="">Choose…</option>
            {chapters.map((c, i) => (
              <option key={c.id} value={i + 1} disabled={c.id === chapter}>
                Position {i + 1}
                {c.id === chapter ? " (now)" : `, before "${c.name}"`}
              </option>
            ))}
          </select>
        </label>
      )}

      {(type === "chapter-missing" || type === "topic-missing") && (
        <label className="flex flex-col gap-1">
          <span>
            {type === "chapter-missing"
              ? "Name of the missing chapter"
              : "Name of the missing topic"}
          </span>
          <input
            className={field}
            value={name}
            maxLength={160}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      )}
      {type === "chapter-missing" && (
        <button type="button" className={`${btn} w-fit`} onClick={() => setUpload(true)}>
          I have the handout: upload it instead
        </button>
      )}

      {(type === "topic-wrong-chapter" || type === "topic-not-in-syllabus") && !topic && (
        <label className="flex flex-col gap-1">
          <span>Which topic?</span>
          <select
            className={field}
            value={topicPick}
            onChange={(e) => setTopicPick(e.target.value)}
          >
            <option value="">Choose…</option>
            {topicChoices.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {type === "topic-wrong-chapter" && (
        <label className="flex flex-col gap-1">
          <span>Which chapter does it belong to?</span>
          <select
            className={field}
            value={toChapter}
            onChange={(e) => setToChapter(e.target.value)}
          >
            <option value="">Choose…</option>
            {chapters
              .filter((c) => c.id !== chapter)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
      )}

      {type && (
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
      )}

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
      <p className="text-xs text-muted">
        Nothing changes straight away: a fix goes live once students from your branch agree.
      </p>
    </form>
  );
}

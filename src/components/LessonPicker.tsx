"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomSubjects } from "@/components/custom/useCustomSubjects";
import { useId, useRef, useState, type FormEvent } from "react";
import { ChapterTimeOptions } from "@/components/chapter/ChapterTimeOptions";
import { DurationChooser } from "@/components/DurationChooser";
import { ChoiceCard } from "@/components/form/ChoiceCard";
import { FieldError, FieldGroup } from "@/components/form/FieldGroup";
import { SlidesPanel } from "@/components/slides/SlidesPanel";
import { KeyIndicator } from "@/components/settings/KeyIndicator";
import { NotesToggle } from "@/components/notes/NotesToggle";
import { BranchSemesterBar } from "@/components/subjects/BranchSemesterBar";
import { useMyBranch } from "@/components/subjects/useMyBranch";
import { TopicSearch } from "@/components/TopicSearch";
import { defaultDuration } from "@/data/durations";
import { availableLevels, type LevelSlug } from "@/data/levels";
import { levelColor } from "@/lib/levelColor";
import { FLAGS } from "@/lib/flags";
import { chapterHref } from "@/lib/chapter/request";
import { isCustomId } from "@/lib/custom/customSubject";
import {
  lessonHref,
  validateLessonRequest,
  type LessonRequestErrors,
  type LessonRequestField,
} from "@/lib/lessonRequest";
import { chaptersOf, subjectsFor, type Subject } from "@/lib/subjects";

const fieldOrder: LessonRequestField[] = ["chapter", "topic", "level", "duration"];

export type PickerInitial = { subject?: string; chapter?: string; topic?: string };

/**
 * The lesson picker. The student's own subjects ("Other subjects", V3 · Step 4) live in their
 * browser, so they are loaded first when the link asks for one of them.
 */
export function LessonPicker(props: { subjects: readonly Subject[]; initial?: PickerInitial }) {
  const custom = useCustomSubjects();
  const wantsCustom = props.initial?.subject ? isCustomId(props.initial.subject) : false;
  if (wantsCustom && !custom.loaded) {
    return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  }
  return (
    <PickerForm
      {...props}
      subjects={[...props.subjects, ...custom.subjects]}
      ownCount={custom.subjects.length}
    />
  );
}

function PickerForm({
  subjects,
  initial = {},
  ownCount = 0,
}: {
  subjects: readonly Subject[];
  /** How many of the subjects (at the end of the list) are the student's own. */
  ownCount?: number;
  /** A choice made elsewhere (search, a subject page), from the URL. */
  initial?: PickerInitial;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  // "My branch and semester": their subjects come first (V3 · Step 3).
  const { mine, save: saveMine } = useMyBranch();
  const [showAll, setShowAll] = useState(false);
  const mineList = mine.branch ? subjectsFor(mine.branch, mine.semester) : [];
  const own = ownCount ? subjects.slice(-ownCount) : [];
  // Built-in subjects for my branch (if set), then my own subjects.
  const shown = mine.branch && !showAll && mineList.length > 0 ? [...mineList, ...own] : subjects;

  const start = subjects.find((s) => s.id === initial.subject) ?? subjects[0];
  const [subjectId, setSubjectId] = useState(start.id);
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const startChapter = chaptersOf(start).find((o) => o.chapter.id === initial.chapter);
  // A chapter linked from another subject is taught and saved under its owner.
  const [chapterId, setChapterId] = useState(startChapter?.chapter.id ?? "");
  const [ownerId, setOwnerId] = useState(startChapter?.owner.id ?? "");
  const [topicId, setTopicId] = useState(
    startChapter?.chapter.topics.some((t) => t.id === initial.topic) ? (initial.topic ?? "") : "",
  );
  const [level, setLevel] = useState("");
  const [duration, setDuration] = useState(String(defaultDuration));
  const [errors, setErrors] = useState<LessonRequestErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [useNotes, setUseNotes] = useState(false);
  // One topic (the usual lesson), the whole chapter, or several chosen topics (V2.5 · Step 3).
  const [scope, setScope] = useState<"topic" | "chapter" | "topics">("topic");
  const [picked, setPicked] = useState<string[]>([]);
  const [chapterMinutes, setChapterMinutes] = useState<number | null>(null);

  const chapterOptions = chaptersOf(subject);
  const selected = chapterOptions.find(
    (o) => o.chapter.id === chapterId && o.owner.id === (ownerId || subject.id),
  );
  const chapter = selected?.chapter;
  const owner = selected?.owner ?? subject;
  const chosenTopics =
    chapter && scope !== "topic"
      ? scope === "chapter"
        ? chapter.topics
        : chapter.topics.filter((t) => picked.includes(t.id))
      : [];
  // What a slide deck or PDF would cover: the topic, the whole chapter, or the ticked topics.
  const slideTopicIds =
    scope === "topic" ? (topicId ? [topicId] : []) : chosenTopics.map((t) => t.id);
  const slideTitle =
    scope === "topic"
      ? (chapter?.topics.find((t) => t.id === topicId)?.name ?? "")
      : (chapter?.name ?? "");
  const chosenLevel: LevelSlug | undefined = availableLevels.find((l) => l.slug === level)?.slug;

  function clearErrors(...fields: LessonRequestField[]) {
    setErrors((prev) => {
      const next = { ...prev };
      for (const f of fields) delete next[f];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (scope !== "topic") return submitChapter();
    const result = validateLessonRequest(
      {
        subject: owner.id,
        chapter: chapterId,
        topic: topicId,
        level,
        duration,
      },
      // A student's own subject is checked against itself (it isn't in the catalogue).
      isCustomId(owner.id) ? [owner] : [],
    );
    if (!result.ok) {
      setErrors(result.errors);
      // Move focus to the first problem so keyboard and screen-reader users land on it.
      const firstBad = fieldOrder.find((f) => result.errors[f]);
      formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    router.push(lessonHref(result.request, { notes: useNotes }));
  }

  function submitChapter() {
    const problems: LessonRequestErrors = {};
    if (!chapter) problems.chapter = "Choose a chapter.";
    else if (chosenTopics.length === 0) problems.topic = "Tick at least one topic.";
    if (!chosenLevel) problems.level = "Choose how well you know this chapter.";
    if (!chapterMinutes) problems.duration = "Choose one of the time options.";
    if (!chapter || !chosenLevel || !chapterMinutes || chosenTopics.length === 0) {
      setErrors(problems);
      const firstBad = fieldOrder.find((f) => problems[f]);
      formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    router.push(
      chapterHref("/chapter", {
        subject: owner.id,
        chapter: chapter.id,
        topics: scope === "topics" ? chosenTopics.map((t) => t.id) : undefined,
        level: chosenLevel,
        minutes: chapterMinutes,
        notes: useNotes,
      }),
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      // Firefox refills form fields after a reload, which the React state never hears about.
      // The dropdown would show a chapter while the topic list still thinks none is chosen.
      autoComplete="off"
      className="flex flex-col gap-7 rounded-2xl border border-border bg-surface p-5 sm:p-8"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Start a lesson</h2>
        <p className="mt-1 text-muted">Tell us what you need. It takes about 20 seconds.</p>
      </div>

      <BranchSemesterBar
        mine={mine}
        onChange={(next) => {
          saveMine(next);
          setShowAll(false);
        }}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Subject</legend>
        <div className="flex flex-wrap gap-2" data-testid="subject-chips">
          {shown.map((s) => (
            <label
              key={s.id}
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                s.id === subject.id
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border hover:bg-surface-2"
              }`}
            >
              <input
                type="radio"
                name="subject"
                value={s.id}
                checked={s.id === subject.id}
                onChange={() => {
                  setSubjectId(s.id);
                  // A new subject has its own chapters: start the choice again.
                  setChapterId("");
                  setOwnerId("");
                  setTopicId("");
                  clearErrors("chapter", "topic");
                }}
                className="sr-only"
              />
              {s.name}
              <span className="font-normal text-muted"> · {s.field}</span>
            </label>
          ))}
          <Link
            href="/my-subjects"
            className="rounded-full border border-dashed border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            + Other subject
          </Link>
        </div>
        {mine.branch && mineList.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-fit text-sm font-semibold text-primary underline underline-offset-2"
          >
            {showAll ? "Show only my subjects" : `Show all ${subjects.length - ownCount} subjects`}
          </button>
        )}
        {mine.branch && mineList.length === 0 && (
          <p className="text-sm text-muted">
            No subjects for that semester yet: showing every subject.
          </p>
        )}
      </fieldset>

      <TopicSearch
        key={subject.id}
        subject={subject}
        onPick={({ chapter, topic }) => {
          setChapterId(chapter.id);
          setOwnerId("");
          setTopicId(topic.id);
          setScope("topic");
          clearErrors("chapter", "topic");
        }}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-chapter`} className="font-semibold">
          Or browse by chapter
        </label>
        <select
          id={`${id}-chapter`}
          name="chapter"
          value={
            chapterId
              ? ownerId && ownerId !== subject.id
                ? `${ownerId}:${chapterId}`
                : chapterId
              : ""
          }
          onChange={(e) => {
            // Linked chapters are "owner:chapter"; the subject's own chapters are plain ids.
            const [a, b] = e.target.value.split(":");
            setOwnerId(b ? a : "");
            setChapterId(b ?? a);
            setTopicId("");
            setPicked([]);
            clearErrors("chapter", "topic");
          }}
          aria-invalid={Boolean(errors.chapter)}
          aria-describedby={errors.chapter ? `${id}-chapter-error` : undefined}
          className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-danger"
        >
          <option value="" disabled>
            Choose a chapter…
          </option>
          {chapterOptions.map(({ chapter: c, owner: o }, i) => (
            <option key={`${o.id}:${c.id}`} value={o.id === subject.id ? c.id : `${o.id}:${c.id}`}>
              {i + 1}. {c.name}
              {o.id === subject.id ? "" : ` (from ${o.name})`}
            </option>
          ))}
        </select>
        <FieldError id={`${id}-chapter-error`} message={errors.chapter} />
      </div>

      <FieldGroup
        legend="Topic"
        hint={chapter ? `${chapter.topics.length} topics in this chapter` : undefined}
        error={chapter ? errors.topic : undefined}
        errorId={`${id}-topic-error`}
      >
        {chapter ? (
          <div className="flex flex-col gap-3">
            <div role="radiogroup" aria-label="What to study" className="flex flex-wrap gap-2">
              {(
                [
                  ["topic", "One topic"],
                  ["chapter", "Study the whole chapter"],
                  ["topics", "Choose topics"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={scope === value}
                  onClick={() => {
                    setScope(value);
                    clearErrors("topic", "duration");
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    scope === value
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border hover:bg-surface-2"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {scope === "topic" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {chapter.topics.map((t) => (
                  <ChoiceCard
                    key={t.id}
                    name="topic"
                    value={t.id}
                    checked={topicId === t.id}
                    onSelect={(v) => {
                      setTopicId(v);
                      clearErrors("topic");
                    }}
                    title={t.name}
                  />
                ))}
              </div>
            )}
            {scope === "chapter" && (
              <p className="rounded-xl bg-surface-2 px-3 py-3 text-sm">
                One continuous lesson covering all {chapter.topics.length} topics, in an order where
                each builds on the last.
              </p>
            )}
            {scope === "topics" && (
              <div className="flex flex-col gap-2">
                <label className="flex w-fit items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={picked.length === chapter.topics.length}
                    onChange={(e) => {
                      setPicked(e.target.checked ? chapter.topics.map((t) => t.id) : []);
                      clearErrors("topic");
                    }}
                  />
                  Select all
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {chapter.topics.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 has-checked:border-primary has-checked:bg-primary-soft"
                    >
                      <input
                        type="checkbox"
                        name="topic"
                        className="mt-1"
                        checked={picked.includes(t.id)}
                        onChange={(e) => {
                          setPicked((list) =>
                            e.target.checked ? [...list, t.id] : list.filter((x) => x !== t.id),
                          );
                          clearErrors("topic");
                        }}
                      />
                      <span className="font-semibold">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted">
            Choose a chapter first to see its topics.
          </p>
        )}
      </FieldGroup>

      <FieldGroup
        legend="How well do you know it?"
        error={errors.level}
        errorId={`${id}-level-error`}
      >
        <div className="grid gap-2 md:grid-cols-3">
          {availableLevels.map((l) => (
            <ChoiceCard
              key={l.slug}
              name="level"
              value={l.slug}
              checked={level === l.slug}
              onSelect={(v) => {
                setLevel(v);
                clearErrors("level");
              }}
              title={l.name}
              description={l.forWho}
              accent={levelColor(l.slug)}
            />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup
        legend="How much time do you have?"
        error={errors.duration}
        errorId={`${id}-duration-error`}
      >
        {scope !== "topic" && chapter ? (
          chosenLevel && chosenTopics.length > 0 ? (
            <ChapterTimeOptions
              subject={owner}
              chapter={chapter}
              topics={chosenTopics}
              level={chosenLevel}
              value={chapterMinutes}
              onChange={setChapterMinutes}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted">
              {chosenTopics.length === 0
                ? "Tick the topics you want first."
                : "Choose a level first: the time options depend on it."}
            </p>
          )
        ) : (
          <DurationChooser
            subject={owner}
            topicId={topicId}
            level={level}
            value={duration}
            onSelect={(v) => {
              setDuration(v);
              clearErrors("duration");
            }}
          />
        )}
      </FieldGroup>

      <NotesToggle checked={useNotes} onChange={setUseNotes} />
      <KeyIndicator />

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-fg transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 sm:w-fit"
      >
        {submitting ? "Opening your lesson…" : "Build my lesson →"}
      </button>
      {FLAGS.slidesPdf && !isCustomId(owner.id) && chapter && (
        <SlidesPanel
          subject={owner}
          chapterId={chapter.id}
          topicIds={slideTopicIds}
          level={chosenLevel}
          title={slideTitle || chapter.name}
        />
      )}
    </form>
  );
}

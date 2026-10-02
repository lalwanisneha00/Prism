"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { ChoiceCard } from "@/components/form/ChoiceCard";
import { FieldError, FieldGroup } from "@/components/form/FieldGroup";
import { TopicSearch } from "@/components/TopicSearch";
import { defaultDuration, durations } from "@/data/durations";
import { availableLevels } from "@/data/levels";
import {
  lessonHref,
  validateLessonRequest,
  type LessonRequestErrors,
  type LessonRequestField,
} from "@/lib/lessonRequest";
import type { Subject } from "@/lib/subjects";

const fieldOrder: LessonRequestField[] = ["chapter", "topic", "level", "duration"];

export function LessonPicker({ subject }: { subject: Subject }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [level, setLevel] = useState("");
  const [duration, setDuration] = useState(String(defaultDuration));
  const [errors, setErrors] = useState<LessonRequestErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const chapter = subject.chapters.find((c) => c.id === chapterId);

  function clearErrors(...fields: LessonRequestField[]) {
    setErrors((prev) => {
      const next = { ...prev };
      for (const f of fields) delete next[f];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateLessonRequest({
      subject: subject.id,
      chapter: chapterId,
      topic: topicId,
      level,
      duration,
    });
    if (!result.ok) {
      setErrors(result.errors);
      // Move focus to the first problem so keyboard and screen-reader users land on it.
      const firstBad = fieldOrder.find((f) => result.errors[f]);
      formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    router.push(lessonHref(result.request));
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

      <div className="flex flex-col gap-2">
        <span className="font-semibold">Subject</span>
        <p className="w-fit rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
          {subject.name} · {subject.field}
        </p>
      </div>

      <TopicSearch
        subject={subject}
        onPick={({ chapter, topic }) => {
          setChapterId(chapter.id);
          setTopicId(topic.id);
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
          value={chapterId}
          onChange={(e) => {
            setChapterId(e.target.value);
            setTopicId("");
            clearErrors("chapter", "topic");
          }}
          aria-invalid={Boolean(errors.chapter)}
          aria-describedby={errors.chapter ? `${id}-chapter-error` : undefined}
          className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-danger"
        >
          <option value="" disabled>
            Choose a chapter…
          </option>
          {subject.chapters.map((c, i) => (
            <option key={c.id} value={c.id}>
              {i + 1}. {c.name}
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
            />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup
        legend="How much time do you have?"
        error={errors.duration}
        errorId={`${id}-duration-error`}
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {durations.map((d) => (
            <ChoiceCard
              key={d.minutes}
              name="duration"
              value={String(d.minutes)}
              checked={duration === String(d.minutes)}
              onSelect={(v) => {
                setDuration(v);
                clearErrors("duration");
              }}
              title={d.label}
              description={d.hint}
              compact
            />
          ))}
        </div>
      </FieldGroup>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-fg transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 sm:w-fit"
      >
        {submitting ? "Opening your lesson…" : "Build my lesson →"}
      </button>
    </form>
  );
}

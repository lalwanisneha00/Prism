"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChoiceCard } from "@/components/form/ChoiceCard";
import { durations } from "@/data/durations";
import { difficultyOf, prerequisiteDepth, recommendLength } from "@/lib/priority/length";
import {
  EMPTY_MODEL,
  importanceFromData,
  isNumericalHeavy,
  loadStudyModel,
  studentStateOf,
  topicKey,
  type StudyModel,
} from "@/lib/priority/model";
import { subjects, type Subject } from "@/lib/subjects";

/**
 * "How much time do you have?" for one topic. Once a topic and level are chosen, one length
 * is marked Recommended (with the reasons), its neighbours are shown, and "Other length" opens
 * the full list. Before that, or for a student's own subject, the plain list shows.
 */
export function DurationChooser({
  subject,
  topicId,
  level,
  value,
  onSelect,
}: {
  subject: Subject;
  topicId: string;
  level: string;
  value: string;
  onSelect: (minutes: string) => void;
}) {
  const [model, setModel] = useState<StudyModel>(EMPTY_MODEL);
  // Own choices belong to one topic and level: a new topic or level starts from the advice again.
  const scope = `${topicId}|${level}`;
  const [ui, setUi] = useState({ scope, touched: false, showAll: false });
  const current = ui.scope === scope ? ui : { scope, touched: false, showAll: false };
  const { touched, showAll } = current;
  // The latest callback, without re-running the effect below when the parent re-renders.
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  });

  useEffect(() => {
    loadStudyModel(subjects)
      .then(setModel)
      .catch(() => undefined);
  }, []);

  const advice = useMemo(() => {
    const all = subject.chapters.flatMap((c) => c.topics);
    const topic = all.find((t) => t.id === topicId);
    if (!topic || !level) return null;
    const importance = importanceFromData(subject, model.overrides).get(topicId);
    if (!importance) return null;
    const key = topicKey(subject.id, topicId);
    return {
      key,
      advice: recommendLength({
        level,
        importance,
        difficulty: difficultyOf(prerequisiteDepth(all, topicId), isNumericalHeavy(subject, topic)),
        student: studentStateOf(model, key),
      }),
      tough: model.predictions.get(key),
    };
  }, [subject, topicId, level, model]);

  // Pre-select the recommendation until the student picks a length themselves.
  const recommended = advice?.advice.recommended;
  useEffect(() => {
    if (recommended !== undefined && !touched) select.current(String(recommended));
  }, [recommended, touched]);

  const choose = (v: string) => {
    setUi({ ...current, touched: true });
    select.current(v);
  };

  if (!advice) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {durations.map((d) => (
          <ChoiceCard
            key={d.minutes}
            name="duration"
            value={String(d.minutes)}
            checked={value === String(d.minutes)}
            onSelect={choose}
            title={d.label}
            description={d.hint}
            compact
          />
        ))}
      </div>
    );
  }

  const options = showAll ? durations.map((d) => d.minutes as number) : advice.advice.options;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm" data-testid="length-why">
        <span className="font-semibold">{advice.advice.why}</span>
        {!advice.advice.certain && (
          <span className="text-muted"> (a starting point: add papers or marks to sharpen it)</span>
        )}
      </p>
      {advice.tough && (
        <p className="text-sm text-warning" data-testid="length-tough">
          May need extra time: {advice.tough.reasons[0]}.
        </p>
      )}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {options.map((m) => {
          const d = durations.find((x) => x.minutes === m)!;
          return (
            <ChoiceCard
              key={m}
              name="duration"
              value={String(m)}
              checked={value === String(m)}
              onSelect={choose}
              title={d.label}
              description={m === recommended ? "Recommended" : d.hint}
              compact
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setUi({ ...current, showAll: !showAll })}
        className="w-fit text-sm font-semibold text-primary underline"
      >
        {showAll ? "Show fewer lengths" : "Other length"}
      </button>
    </div>
  );
}

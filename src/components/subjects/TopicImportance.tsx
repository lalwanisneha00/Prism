"use client";

import { useEffect, useState } from "react";
import { bandLabel, whyImportance, type Band } from "@/lib/priority/importance";
import {
  EMPTY_MODEL,
  importanceFromData,
  loadStudyModel,
  subjectImportance,
  topicKey,
  type StudyModel,
} from "@/lib/priority/model";
import { updateSettings } from "@/lib/storage/progress";
import { findSubject, subjects } from "@/lib/subjects";

const bandStyle: Record<Band, string> = {
  high: "border-success text-success",
  medium: "border-border text-muted",
  low: "border-warning text-warning",
};

/**
 * Which topics repay study time most (High, Medium or Low return), with the real reasons and a
 * way to set your own ("my professor said this is important"). Your choice always wins.
 */
export function TopicImportance({ subjectId }: { subjectId: string }) {
  const subject = findSubject(subjectId)!;
  const [model, setModel] = useState<StudyModel>(EMPTY_MODEL);
  const [overrides, setOverrides] = useState<Record<string, Band>>({});
  const [papers, setPapers] = useState<Awaited<ReturnType<typeof subjectImportance>> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadStudyModel(subjects)
      .then((m) => {
        setModel(m);
        setOverrides(m.overrides);
        return subjectImportance(subject, m.overrides);
      })
      .then(setPapers)
      .catch(() => setError(true));
  }, [subject]);

  async function set(key: string, value: Band | "auto") {
    const next = { ...overrides };
    if (value === "auto") delete next[key];
    else next[key] = value;
    setOverrides(next);
    try {
      await updateSettings({ importanceOverrides: next });
      setError(false);
    } catch {
      setError(true);
    }
  }

  // Recomputed from the overrides on screen so a change shows at once.
  const importance = importanceFromData(subject, overrides);
  const evidence = papers ?? importance;

  return (
    <section aria-label="Topic importance" className="flex flex-col gap-3">
      <div>
        <h2 className="text-xl font-bold">How much each topic is worth</h2>
        <p className="text-sm text-muted">
          Prism never invents weightage. It uses your uploaded previous-year papers, the syllabus
          marks or hours, and how many later topics build on a topic. Set your own if you know
          better.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          Couldn&apos;t save: this browser is blocking storage.
        </p>
      )}
      {subject.chapters.map((c) => (
        <div key={c.id} className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-semibold">{c.name}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {c.topics.map((t) => {
              const key = topicKey(subject.id, t.id);
              // Your own choice always wins; otherwise the paper-based estimate when papers exist.
              const imp = (overrides[key] ? importance : evidence).get(t.id);
              if (!imp) return null;
              const weak = model.weakness.get(key)?.weak;
              const tough = model.predictions.has(key);
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{t.name}</span>
                    {weak && <span className="ml-2 text-xs text-danger">Weak topic</span>}
                    {!weak && tough && (
                      <span className="ml-2 text-xs text-warning">May need extra time</span>
                    )}
                    <span className="block text-xs text-muted">{whyImportance(imp)}</span>
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${bandStyle[imp.band]}`}
                  >
                    {imp.known ? bandLabel(imp.band) : "Not known yet"}
                  </span>
                  <select
                    aria-label={`Importance of ${t.name}`}
                    value={overrides[key] ?? "auto"}
                    onChange={(e) => void set(key, e.target.value as Band | "auto")}
                    className="rounded-lg border border-border bg-bg px-2 py-1 text-xs"
                  >
                    <option value="auto">Automatic</option>
                    <option value="high">High (mine)</option>
                    <option value="medium">Medium (mine)</option>
                    <option value="low">Low (mine)</option>
                  </select>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

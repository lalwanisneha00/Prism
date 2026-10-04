"use client";

import Link from "next/link";
import { useState } from "react";
import { useCustomSubjects } from "@/components/custom/useCustomSubjects";
import { SUGGESTED_NAMES } from "@/lib/custom/customSubject";
import { deleteCustomSubject, duplicateCustomSubject } from "@/lib/custom/store";

/** "Other subjects": quick-start suggestions, "Add my own subject", and the student's list. */
export function OtherSubjectsStart() {
  return (
    <div className="flex flex-col gap-3" data-testid="other-subjects">
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_NAMES.map((n) => (
          <Link
            key={n}
            href={`/my-subjects/new?name=${encodeURIComponent(n)}`}
            className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
          >
            {n}
          </Link>
        ))}
      </div>
      <Link
        href="/my-subjects/new"
        className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
      >
        + Add my own subject
      </Link>
      <p className="text-xs text-muted">
        These subjects differ between universities, so Prism follows your own syllabus and material
        instead of a built-in one.
      </p>
    </div>
  );
}

/** The student's own subjects with open, edit, duplicate and delete. */
export function MySubjectsList() {
  const { records, loaded, reload } = useCustomSubjects();
  const [confirm, setConfirm] = useState<string | null>(null);

  if (!loaded)
    return <div className="h-24 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  if (records.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">
        No subjects of your own yet. Pick a suggestion above or add your own.
      </p>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-testid="my-subjects-list">
      {records.map((r) => {
        const topics = r.chapters.reduce((n, c) => n + c.topics.length, 0);
        return (
          <li
            key={r.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <Link
              href={`/my-subjects/view?id=${r.id}`}
              className="flex flex-col gap-1 hover:underline"
            >
              <span className="font-semibold">{r.name}</span>
              <span className="text-sm text-muted">
                {r.chapters.length} units · {topics} topics ·{" "}
                {r.teaching === "skill" ? "skill subject" : "theory subject"}
                {r.details.examDate ? ` · exam ${r.details.examDate}` : ""}
              </span>
            </Link>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href={`/?subject=${r.id}#start`}
                className="rounded-full bg-primary px-3 py-1.5 font-semibold text-primary-fg"
              >
                Start a lesson
              </Link>
              <Link
                href={`/my-subjects/edit?id=${r.id}`}
                className="rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-surface-2"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => void duplicateCustomSubject(r.id).then(reload)}
                className="rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-surface-2"
              >
                Duplicate
              </button>
              {confirm === r.id ? (
                <button
                  type="button"
                  onClick={() =>
                    void deleteCustomSubject(r.id).then(() => {
                      setConfirm(null);
                      reload();
                    })
                  }
                  className="rounded-full border border-danger px-3 py-1.5 font-semibold text-danger"
                >
                  Yes, delete it
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirm(r.id)}
                  className="rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-surface-2"
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

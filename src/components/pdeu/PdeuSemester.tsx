"use client";

import Link from "next/link";
import subjectMap from "@/data/pdeu/subject-map.json";
import { useEffect, useId, useState } from "react";
import { useElectiveChoices } from "@/components/pdeu/useElectiveChoices";
import { choiceId, type ElectiveChoices } from "@/lib/pdeu/electives";
import { coursesOf, topicCount } from "@/lib/pdeu/helpers";
import { loadPdeuBranch, type PdeuBranchId } from "@/lib/pdeu/load";
import { NON_CORE_UPLOAD_MESSAGE } from "@/lib/pdeu/messages";
import type { PdeuBranch, PdeuCourse } from "@/lib/pdeu/types";

const card = "flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4";
const subjectIds = subjectMap as Record<string, string>;

/** The options of an elective slot (a slot that shares its options names the slot that lists them). */
function optionsOf(branch: PdeuBranch, course: PdeuCourse) {
  if (course.options?.length) return course.options;
  if (course.optionsListedUnder) {
    return (
      branch.subjects.find(
        (s) => s.name === course.optionsListedUnder && s.semester === course.semester,
      )?.options ?? []
    );
  }
  return [];
}

function UploadNote({ subjectId }: { subjectId: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl bg-primary-soft px-3 py-2 text-xs"
      data-testid="upload-material-note"
    >
      <p>{NON_CORE_UPLOAD_MESSAGE}</p>
      <Link
        href={`/notes?subject=${subjectId}`}
        className="w-fit font-semibold text-primary underline"
      >
        Upload material
      </Link>
    </div>
  );
}

function CourseCard({
  branch,
  course,
  choices,
  onChoose,
}: {
  branch: PdeuBranch;
  course: PdeuCourse;
  choices: ElectiveChoices;
  onChoose: (slotKey: string, optionKey: string) => void;
}) {
  const id = useId();
  const topics = topicCount(course);
  // Courses with a syllabus are subjects on Prism (lessons, quizzes, map); the rest keep PDEU's page.
  const subjectId = subjectIds[`${branch.id}/${course.key}`];
  const href = subjectId ? `/subjects/${subjectId}` : `/pdeu/${branch.id}/${course.key}`;
  const options = optionsOf(branch, course);
  const chosenKey = choices[choiceId(branch.id, course.key)] ?? "";
  const chosen = options.find((o) => o.key === chosenKey);
  const chosenSubject = chosen ? subjectIds[`${branch.id}/${chosen.key}`] : undefined;
  return (
    <li className={card} data-testid="pdeu-course">
      <div className="flex items-start justify-between gap-3">
        {options.length > 0 ? (
          <span className="font-semibold">{course.name}</span>
        ) : (
          <Link href={href} className="font-semibold hover:underline">
            {course.name}
          </Link>
        )}
      </div>
      {options.length > 0 ? (
        <div className="flex flex-col gap-1" data-testid="elective-slot">
          <label htmlFor={id} className="text-sm text-muted">
            {chosen ? "Your choice" : "Choose yours"}
          </label>
          <select
            id={id}
            value={chosenKey}
            onChange={(e) => onChoose(course.key, e.target.value)}
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
          >
            <option value="">Choose yours…</option>
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
              </option>
            ))}
          </select>
          {chosen && chosenSubject && (
            <Link
              href={`/subjects/${chosenSubject}`}
              className="w-fit text-sm font-semibold text-primary underline"
              data-testid="elective-chosen"
            >
              Open {chosen.name}
            </Link>
          )}
          {chosen && !chosenSubject && (
            <p className="text-xs text-muted">The handbook prints no syllabus for this option.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">
          {course.units.length > 0
            ? `${course.units.length} unit${course.units.length === 1 ? "" : "s"} · ${topics} topics`
            : course.experiments?.length
              ? `${course.experiments.length} experiments`
              : "No syllabus printed in the handbook"}
        </p>
      )}
      {options.length === 0 && subjectId && !course.core && <UploadNote subjectId={subjectId} />}
      {options.length === 0 && subjectId && course.core && (
        <p className="text-xs font-semibold text-success" data-testid="pdeu-on-prism">
          Lessons, quizzes and concept map on Prism
        </p>
      )}
      {chosenSubject && !course.core && <UploadNote subjectId={chosenSubject} />}
    </li>
  );
}

function Section({
  title,
  note,
  branch,
  courses,
  choices,
  onChoose,
  testId,
}: {
  title: string;
  note: string;
  branch: PdeuBranch;
  courses: PdeuCourse[];
  choices: ElectiveChoices;
  onChoose: (slotKey: string, optionKey: string) => void;
  testId: string;
}) {
  return (
    <section className="flex flex-col gap-3" data-testid={testId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted">
          {courses.length} course{courses.length === 1 ? "" : "s"}
        </p>
      </div>
      <p className="text-sm text-muted">{note}</p>
      {courses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
          Nothing in this part of the semester.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {courses.map((c) => (
            <CourseCard
              key={c.key}
              branch={branch}
              course={c}
              choices={choices}
              onChoose={onChoose}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** All of a student's subjects for the semester, from PDEU's syllabus: core and non-core, electives chosen by the student. */
export function PdeuSemester({ branchId, semester }: { branchId: PdeuBranchId; semester: number }) {
  const [loaded, setLoaded] = useState<{ id: string; branch: PdeuBranch | null } | null>(null);
  const { choices, choose } = useElectiveChoices();
  useEffect(() => {
    let live = true;
    loadPdeuBranch(branchId)
      .then((b) => live && setLoaded({ id: branchId, branch: b }))
      .catch(() => live && setLoaded({ id: branchId, branch: null }));
    return () => {
      live = false;
    };
  }, [branchId]);
  const branch = loaded && loaded.id === branchId ? loaded.branch : "loading";

  if (branch === "loading") {
    return <div className="h-40 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  }
  if (!branch) {
    return (
      <p role="alert" className="rounded-2xl border border-border p-4 text-sm">
        PDEU&apos;s syllabus could not be loaded. Check your connection and reload the page.
      </p>
    );
  }
  const onChoose = (slotKey: string, optionKey: string) => choose(branch.id, slotKey, optionKey);
  return (
    <div className="flex flex-col gap-6" data-testid="pdeu-semester">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">
          {branch.name}, semester {semester}
        </h2>
        <p className="text-sm text-muted">
          Syllabus from PDEU&apos;s {branch.handbook.replace(/\s*\(.*$/, "")}.
        </p>
        {branch.notes.length > 0 && (
          <details className="text-sm text-muted">
            <summary className="w-fit cursor-pointer font-medium">About this syllabus</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {branch.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <Section
        title="Core subjects"
        note="Science, engineering science and program core courses, program electives, and the project."
        branch={branch}
        courses={coursesOf(branch, semester, true)}
        choices={choices}
        onChoose={onChoose}
        testId="pdeu-core"
      />
      <Section
        title="Non-core subjects"
        note="Humanities, values, communication, open electives and internships. These depend on the material your faculty gives, so you can upload it for each one."
        branch={branch}
        courses={coursesOf(branch, semester, false)}
        choices={choices}
        onChoose={onChoose}
        testId="pdeu-noncore"
      />
    </div>
  );
}

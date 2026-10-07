"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  codeText,
  coursesOf,
  ltpText,
  prismMatch,
  semesterCredits,
  topicCount,
} from "@/lib/pdeu/helpers";
import { loadPdeuBranch, type PdeuBranchId } from "@/lib/pdeu/load";
import type { PdeuBranch, PdeuCourse } from "@/lib/pdeu/types";

const card = "flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4";

function CourseCard({ branch, course }: { branch: PdeuBranch; course: PdeuCourse }) {
  const topics = topicCount(course);
  const match = course.core ? prismMatch(course.name) : undefined;
  const options = course.options?.length ?? 0;
  return (
    <li className={card} data-testid="pdeu-course">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/pdeu/${branch.id}/${course.key}`} className="font-semibold hover:underline">
          {course.name}
        </Link>
        <span
          className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold"
          data-testid="pdeu-credits"
        >
          {course.credits} credit{course.credits === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-sm text-muted">
        {codeText(course)} · {course.category}
        {course.ltp ? ` · L-T-P ${course.ltp}` : ""}
      </p>
      {course.ltp && ltpText(course.ltp) && (
        <p className="text-xs text-muted">{ltpText(course.ltp)} hours a week</p>
      )}
      <p className="text-sm text-muted">
        {options > 0
          ? `Choose one of ${options} options`
          : course.optionsListedUnder
            ? `Options are listed under ${course.optionsListedUnder}`
            : course.units.length > 0
              ? `${course.units.length} unit${course.units.length === 1 ? "" : "s"} · ${topics} topics`
              : course.experiments?.length
                ? `${course.experiments.length} experiments`
                : "No syllabus printed in the handbook"}
      </p>
      {match && (
        <p className="text-xs font-semibold text-success" data-testid="pdeu-on-prism">
          Prism has {match.part ? "lessons for part of this subject" : "lessons for this subject"}
        </p>
      )}
    </li>
  );
}

function Section({
  title,
  note,
  branch,
  courses,
  credits,
  testId,
}: {
  title: string;
  note: string;
  branch: PdeuBranch;
  courses: PdeuCourse[];
  credits: number;
  testId: string;
}) {
  return (
    <section className="flex flex-col gap-3" data-testid={testId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted">
          {courses.length} course{courses.length === 1 ? "" : "s"} · {credits} credits
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
            <CourseCard key={c.key} branch={branch} course={c} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** PDEU's own subjects for one branch and semester: core and non-core in two sections, with credits. */
export function PdeuSemester({ branchId, semester }: { branchId: PdeuBranchId; semester: number }) {
  const [loaded, setLoaded] = useState<{ id: string; branch: PdeuBranch | null } | null>(null);
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
  const credits = semesterCredits(branch, semester);
  return (
    <div className="flex flex-col gap-6" data-testid="pdeu-semester">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">
          {branch.name}, semester {semester}
        </h2>
        <p className="text-sm text-muted" data-testid="pdeu-credit-total">
          {credits.total} credits this semester: {credits.core} core + {credits.notCore} not core.
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
        credits={credits.core}
        testId="pdeu-core"
      />
      <Section
        title="Non-core subjects"
        note="Humanities, values, communication, open electives and internships. These depend on the material your faculty gives, so you can upload it for each one."
        branch={branch}
        courses={coursesOf(branch, semester, false)}
        credits={credits.notCore}
        testId="pdeu-noncore"
      />
    </div>
  );
}

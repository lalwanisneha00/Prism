"use client";

import Link from "next/link";
import { FixWentLive } from "@/components/flags/FixWentLive";
import { SubjectFlag } from "@/components/flags/SubjectFlag";
import { MissingSubjectEntry } from "@/components/flags/MissingSubjectEntry";
import { LabCard } from "@/components/pdeu/PdeuSemester";
import { CourseTags, RelatedCourseLine } from "@/components/subjects/CourseTags";
import { useSyllabusOverlay } from "@/components/subjects/useSyllabusOverlay";
import { subjects } from "@/lib/subjects";
import { liveSemesterIds } from "@/lib/syllabusFix/overlay";
import {
  activeCourse,
  countsOf,
  labsInSemester,
  relatedOf,
  subjectsInSemester,
  type IndexedSubject,
} from "@/lib/catalogue";
import { needsFacultyMaterial, NON_CORE_UPLOAD_MESSAGE } from "@/lib/pdeu/messages";

const card = "flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4";

function CourseCard({ course, labs }: { course: IndexedSubject; labs: IndexedSubject[] }) {
  const { chapters, topics } = countsOf(course);
  return (
    <li className={card} data-testid="pdeu-course">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/subjects/${course.id}`} className="font-semibold hover:underline">
          {course.name}
        </Link>
        <SubjectFlag subjectId={course.id} />
      </div>
      <CourseTags category={course.courseCategory ?? "core"} type={course.courseType} />
      <p className="text-sm text-muted">
        {chapters > 0
          ? `${chapters} unit${chapters === 1 ? "" : "s"} · ${topics} topics`
          : "No syllabus on Prism yet"}
      </p>
      {needsFacultyMaterial(course) && (
        <div
          className="flex flex-col gap-1 rounded-xl bg-primary-soft px-3 py-2 text-xs"
          data-testid="upload-material-note"
        >
          <p>{NON_CORE_UPLOAD_MESSAGE}</p>
          <Link
            href={`/notes?subject=${course.id}`}
            className="w-fit font-semibold text-primary underline"
          >
            Upload material
          </Link>
        </div>
      )}
      <RelatedCourseLine isLab={false} related={labs} />
    </li>
  );
}

function Section({
  title,
  note,
  courses,
  labs,
  testId,
}: {
  title: string;
  note: string;
  courses: IndexedSubject[];
  labs: IndexedSubject[];
  testId: string;
}) {
  // Each lab right after its theory course; the rest at the end.
  const placed = new Set<string>();
  const items: ({ course: IndexedSubject; labs: IndexedSubject[] } | { lab: IndexedSubject })[] =
    courses.flatMap((c) => {
      const own = relatedOf(c).filter((r) => r.courseType === "practical");
      const after = own.filter((l) => labs.some((x) => x.id === l.id) && !placed.has(l.id));
      after.forEach((l) => placed.add(l.id));
      return [{ course: c, labs: own }, ...after.map((lab) => ({ lab }))];
    });
  items.push(...labs.filter((l) => !placed.has(l.id)).map((lab) => ({ lab })));
  return (
    <section className="flex flex-col gap-3" data-testid={testId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted">
          {items.length} course{items.length === 1 ? "" : "s"}
        </p>
      </div>
      <p className="text-sm text-muted">{note}</p>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
          Nothing in this part of the semester.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) =>
            "lab" in item ? (
              <LabCard key={item.lab.id} lab={item.lab} />
            ) : (
              <CourseCard key={item.course.id} course={item.course} labs={item.labs} />
            ),
          )}
        </ul>
      )}
    </section>
  );
}

/**
 * A semester's courses for a PDEU branch with no handbook list on Prism (Electrical, Chemical),
 * from the course data itself: Core and Non-core, each lab next to its theory course (Phase 4B).
 */
export function CatalogueSemester({
  branchId,
  branchName,
  semester,
}: {
  branchId: string;
  branchName: string;
  semester: number;
}) {
  // Phase 7: courses students moved into or out of this semester count too.
  const overlay = useSyllabusOverlay();
  const courses = liveSemesterIds(
    subjectsInSemester(semester, branchId)
      .filter((s) => s.courseType !== "practical")
      .map((s) => s.id),
    overlay,
    branchId,
    semester,
    (id) => subjects.find((s) => s.id === id),
  ).flatMap((id) => {
    const s = activeCourse(id);
    return s && s.courseType !== "practical" ? [s] : [];
  });
  const labs = labsInSemester(semester, branchId);
  const isCore = (s: IndexedSubject) => s.courseCategory !== "non-core";
  return (
    <div className="flex flex-col gap-6" data-testid="pdeu-semester">
      <h2 className="text-xl font-semibold">
        {branchName}, semester {semester}
      </h2>
      <Section
        title="Core subjects"
        note="Science, engineering science and program core courses, and their labs."
        courses={courses.filter(isCore)}
        labs={labs.filter(isCore)}
        testId="pdeu-core"
      />
      <Section
        title="Non-core subjects"
        note="Humanities, values, communication and open electives. These depend on the material your faculty gives, so you can upload it for each one."
        courses={courses.filter((s) => !isCore(s))}
        labs={labs.filter((s) => !isCore(s))}
        testId="pdeu-noncore"
      />
      <FixWentLive />
      <MissingSubjectEntry semester={semester} />
    </div>
  );
}

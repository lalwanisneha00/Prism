import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import subjectMap from "@/data/pdeu/subject-map.json";
import { StudyFromSyllabus } from "@/components/pdeu/StudyFromSyllabus";
import {
  codeText,
  findCourse,
  hasUnits,
  isLab,
  ltpText,
  toDraftChapters,
  topicCount,
} from "@/lib/pdeu/helpers";
import { isPdeuBranch, loadPdeuBranch } from "@/lib/pdeu/load";
import { findSubject } from "@/lib/subjects";

export async function generateMetadata({
  params,
}: PageProps<"/pdeu/[branch]/[key]">): Promise<Metadata> {
  const { branch, key } = await params;
  if (!isPdeuBranch(branch)) return { title: "Subject" };
  const course = findCourse(await loadPdeuBranch(branch), key);
  return { title: course?.name ?? "Subject" };
}

/** One PDEU course: its handbook details, units and topics (or experiments), and ways to study it. */
export default async function PdeuCoursePage({ params }: PageProps<"/pdeu/[branch]/[key]">) {
  const { branch: branchId, key } = await params;
  if (!isPdeuBranch(branchId)) notFound();
  const branch = await loadPdeuBranch(branchId);
  const course = findCourse(branch, key);
  if (!course) notFound();

  const semester = course.semester ?? 1;
  const core = course.core ?? true;
  const subjectIds = subjectMap as Record<string, string>;
  const prism = findSubject(subjectIds[`${branchId}/${key}`] ?? "");
  const slot = branch.subjects.find((s) => s.key === key && s.options);
  const listedUnder = slot?.optionsListedUnder
    ? branch.subjects.find((s) => s.name === slot.optionsListedUnder && s.semester === semester)
    : undefined;
  const chapters = toDraftChapters(course);
  const details: [string, string][] = [
    ["Code", codeText(course)],
    ["Category", course.category],
    ["Semester", String(semester)],
    ["Credits", `${course.credits}${course.creditsNote ? ` (${course.creditsNote})` : ""}`],
    ...(course.ltp
      ? ([["Hours a week (L-T-P)", `${course.ltp} · ${ltpText(course.ltp)}`]] as [string, string][])
      : []),
    ["Counts as", core ? "Core subject" : "Non-core subject"],
    ...(course.track ? ([["Track", course.track]] as [string, string][]) : []),
  ];

  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          <Link href="/subjects" className="underline">
            Subjects
          </Link>{" "}
          › {branch.name} › Semester {semester}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
        <dl
          className="grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm"
          data-testid="pdeu-details"
        >
          {details.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted">
          From PDEU&apos;s {branch.handbook.replace(/\s*\(.*$/, "")}. Topics are copied from the
          handbook as printed.
        </p>
      </div>

      {(course.notes?.length ?? 0) > 0 && (
        <div role="note" className="max-w-2xl rounded-xl bg-surface-2 px-4 py-3 text-sm">
          {course.notes?.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}

      {prism && (
        <section
          className="flex max-w-2xl flex-col gap-2 rounded-2xl border border-success/40 bg-success/10 p-4"
          data-testid="pdeu-prism-lessons"
        >
          <h2 className="text-lg font-semibold">Lessons on Prism</h2>
          <p className="text-sm">
            This course is a subject on Prism with PDEU&apos;s own units and topics: lessons at six
            levels, quizzes, flashcards, a concept map and a mock test.
          </p>
          <Link
            href={`/subjects/${prism.id}`}
            className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
          >
            Open {prism.name}
          </Link>
        </section>
      )}

      {hasUnits(course) && (
        <section className="flex flex-col gap-3" data-testid="pdeu-units">
          <h2 className="text-xl font-semibold">
            Units and topics{" "}
            <span className="text-sm font-normal text-muted">
              ({course.units.length} units · {topicCount(course)} topics)
            </span>
          </h2>
          <ol className="flex flex-col gap-3">
            {course.units.map((u) => (
              <li key={u.number} className="rounded-2xl border border-border bg-surface p-4">
                <h3 className="font-semibold">
                  Unit {u.number}: {u.title}
                  {u.hours ? (
                    <span className="ml-2 text-sm font-normal text-muted">{u.hours} hrs</span>
                  ) : null}
                </h3>
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted">
                  {u.topics.map((t, i) => (
                    <li key={`${i}-${t}`}>{t}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {!prism && (
            <div className="flex flex-col gap-2">
              <StudyFromSyllabus
                name={course.name}
                semester={semester}
                chapters={chapters}
                goTo="view"
                label="Study this syllabus on Prism"
                primary={!prism}
              />
              <p className="max-w-2xl text-xs text-muted">
                Makes a subject on your account with these units and topics, so you can get lessons,
                quizzes and flashcards for each topic.
              </p>
            </div>
          )}
        </section>
      )}

      {isLab(course) && (
        <section className="flex flex-col gap-3" data-testid="pdeu-experiments">
          <h2 className="text-xl font-semibold">Experiments</h2>
          <ol className="list-decimal space-y-1 pl-6 text-sm text-muted">
            {course.experiments?.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ol>
        </section>
      )}

      {slot && (slot.options?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-3" data-testid="pdeu-options">
          <h2 className="text-xl font-semibold">Options to choose from</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {slot.options?.map((o) => (
              <li
                key={o.key}
                className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4"
              >
                <Link
                  href={
                    subjectIds[`${branch.id}/${o.key}`]
                      ? `/subjects/${subjectIds[`${branch.id}/${o.key}`]}`
                      : `/pdeu/${branch.id}/${o.key}`
                  }
                  className="font-semibold hover:underline"
                >
                  {o.name}
                </Link>
                <p className="text-sm text-muted">
                  {codeText(o)} · {o.credits} credits
                  {o.track ? ` · ${o.track}` : ""}
                  {o.slot && o.slot.includes("/") ? ` · for ${o.slot}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {listedUnder && (
        <p className="max-w-2xl text-sm text-muted">
          The options for this slot are the same as for{" "}
          <Link
            href={`/pdeu/${branch.id}/${listedUnder.key}`}
            className="font-semibold text-primary underline"
          >
            {listedUnder.name}
          </Link>
          .
        </p>
      )}

      {!core && (
        <section
          className="flex max-w-2xl flex-col gap-2 rounded-2xl bg-primary-soft p-4"
          data-testid="pdeu-material"
        >
          <h2 className="text-lg font-semibold">Your faculty&apos;s material</h2>
          <p className="text-sm">
            What you are taught in this subject depends a lot on the material your faculty gives.
            Upload it (slides, notes, PDFs) and Prism builds lessons from it. This is optional and
            you can do it any time.
          </p>
          {hasUnits(course) ? (
            <StudyFromSyllabus
              name={course.name}
              semester={semester}
              chapters={chapters}
              goTo="edit"
              label="Upload faculty material"
            />
          ) : (
            <Link
              href={`/my-subjects/new?name=${encodeURIComponent(course.name)}&semester=${semester}`}
              className="w-fit rounded-full border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary-soft"
            >
              Add this subject and upload faculty material
            </Link>
          )}
        </section>
      )}
    </Container>
  );
}

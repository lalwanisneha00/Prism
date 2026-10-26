import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/Container";
import { TierBadge } from "@/components/lesson/TierBadge";
import { TopicImportance } from "@/components/subjects/TopicImportance";
import { HandoutBanner } from "@/components/subjects/HandoutBanner";
import { CourseFlag } from "@/components/flags/CourseFlag";
import { SubjectProgress } from "@/components/subjects/SubjectProgress";
import { ConceptMapSection } from "@/components/subjects/ConceptMapSection";
import { CourseSummary } from "@/components/subjects/CourseSummary";
import { MaterialStatus } from "@/components/subjects/MaterialStatus";
import { StartLessonLink } from "@/components/subjects/StartLessonLink";
import { needsFacultyMaterial } from "@/lib/pdeu/messages";
import { evalStatusCopy, evalStatusOf } from "@/lib/evalStatus";
import { allSubjects, branchesOf, findSubject, subjects } from "@/lib/subjects";
import { aliases } from "@/lib/syllabusFix/alias";
import { courseCodes } from "@/lib/syllabusFix/flags";
import { resolveMeta } from "@/lib/syllabusFix/tree";

// Only the known subjects exist: anything else is a real 404 (not a streamed 200 page).
export const dynamicParams = false;

export function generateStaticParams() {
  // A merged course's retired copies keep their page as a forwarding address.
  // Labs are hidden from lists until Phase 7B, but each has its own page (experiments, flags).
  const labs = allSubjects.filter(
    (s) => s.university === "pdeu" && s.courseType === "practical" && s.status !== "retired",
  );
  return [
    ...new Set([...subjects, ...labs].map((s) => s.id)),
    ...Object.keys(aliases.subjects),
  ].map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/subjects/[id]">): Promise<Metadata> {
  const subject = findSubject((await params).id);
  return { title: subject?.name ?? "Subject" };
}

/** A subject page: its chapters and progress, weak topics, trust badge and shortcuts (V3 · Step 3). */
export default async function SubjectPage({ params }: PageProps<"/subjects/[id]">) {
  const id = (await params).id;
  const main = aliases.subjects[id];
  // Temporary (307), not permanent: the merge can be undone (migration down).
  if (main) redirect(`/subjects/${main}`);
  const subject = findSubject(id);
  if (!subject) notFound();
  const branchNames = subject.branches.includes("all")
    ? "All branches (first-year common subject)"
    : branchesOf(subject)
        .map((b) => b.name)
        .join(", ");
  const isLab = subject.courseType === "practical";
  const actions = [
    // Lab lessons (aim, procedure, viva, simulation) come in Phase 7B.
    ...(isLab ? [] : [{ href: `/start?subject=${subject.id}`, label: "Start a lesson" }]),
    ...(isLab
      ? []
      : [
          { href: `/mock-test?subject=${subject.id}`, label: "Mock test (several chapters)" },
          { href: `/map?subject=${subject.id}`, label: "Concept map" },
        ]),
    { href: `/notes?subject=${subject.id}`, label: "My materials" },
    { href: `/planner`, label: "Backlog planner" },
  ];
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          <Link href="/subjects" className="underline">
            Subjects
          </Link>{" "}
          › {subject.field}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
          {subject.university === "pdeu" && (
            <CourseFlag
              subject={{ id: subject.id, name: subject.name, codes: courseCodes(subject) }}
            />
          )}
        </div>
        {/* PDEU courses show where they are taught (and much more) in their summary. */}
        {subject.university === "pdeu" ? (
          <CourseSummary subject={subject} />
        ) : (
          <p className="text-muted">
            {branchNames} ·{" "}
            {subject.semesters.length > 0
              ? `usually semester ${subject.semesters.join(" or ")}`
              : "semester not confirmed yet"}
          </p>
        )}
        <TierBadge tier={subject.tier} />
        {evalStatusOf(subject.id) !== "measured" && (
          <p
            role="note"
            data-testid="eval-pending"
            className="max-w-2xl rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
          >
            <b>{evalStatusCopy[evalStatusOf(subject.id)].short}.</b>{" "}
            {evalStatusCopy[evalStatusOf(subject.id)].long}{" "}
            <Link href="/accuracy" className="font-semibold text-primary underline">
              How we measure accuracy
            </Link>
          </p>
        )}
        <p className="text-sm text-muted">
          Syllabus source:{" "}
          {subject.syllabusSource.url ? (
            <a
              href={subject.syllabusSource.url}
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              {subject.syllabusSource.title}
            </a>
          ) : (
            subject.syllabusSource.title
          )}
        </p>
        {subject.syllabusSource.note && (
          <details className="text-sm text-muted">
            <summary className="w-fit cursor-pointer font-medium">
              How this syllabus was put together
            </summary>
            <p className="mt-1 max-w-2xl">{subject.syllabusSource.note}</p>
          </details>
        )}
        {needsFacultyMaterial(subject) && <MaterialStatus subjectId={subject.id} />}
        {subject.university === "pdeu" && (
          <HandoutBanner
            subjectId={subject.id}
            subjectName={subject.name}
            codes={courseCodes(subject)}
            confidence={resolveMeta(subject).confidence}
            {...(subject.batchYears ? { batchYears: subject.batchYears } : {})}
          />
        )}
        <nav aria-label="Shortcuts" className="flex flex-wrap gap-2">
          {actions.map((a, i) => {
            const className =
              i === 0
                ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
                : "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2";
            // Non-core without the faculty's material: "Start a lesson" goes to the upload page.
            return a.label === "Start a lesson" ? (
              <StartLessonLink
                key={a.href}
                subjectId={subject.id}
                needsMaterial={needsFacultyMaterial(subject)}
                className={className}
              />
            ) : (
              <Link key={a.href} href={a.href} className={className}>
                {a.label}
              </Link>
            );
          })}
        </nav>
        {isLab && (
          <p className="max-w-2xl rounded-xl bg-surface-2 px-4 py-3 text-sm" data-testid="lab-note">
            Lab lessons (aim, theory, procedure, observations, viva and a simulation for each
            experiment) are coming in a later update. For now you can check the experiment list and
            report anything wrong.
          </p>
        )}
      </div>
      {isLab && subject.chapters.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
          The experiment list for this lab is not on Prism yet. Upload the handout above to add it.
        </p>
      )}
      <SubjectProgress subjectId={subject.id} collapsible />
      {!isLab && subject.university === "pdeu" && <ConceptMapSection subjectId={subject.id} />}
      {!isLab && <TopicImportance subjectId={subject.id} />}
    </Container>
  );
}

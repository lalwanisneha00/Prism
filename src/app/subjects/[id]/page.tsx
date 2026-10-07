import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { TierBadge } from "@/components/lesson/TierBadge";
import { TopicImportance } from "@/components/subjects/TopicImportance";
import { SubjectProgress } from "@/components/subjects/SubjectProgress";
import { needsFacultyMaterial, NON_CORE_UPLOAD_MESSAGE } from "@/lib/pdeu/messages";
import { evalStatusCopy, evalStatusOf } from "@/lib/evalStatus";
import { branchesOf, findSubject, subjects } from "@/lib/subjects";

// Only the known subjects exist: anything else is a real 404 (not a streamed 200 page).
export const dynamicParams = false;

export function generateStaticParams() {
  return subjects.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/subjects/[id]">): Promise<Metadata> {
  const subject = findSubject((await params).id);
  return { title: subject?.name ?? "Subject" };
}

/** A subject page: its chapters and progress, weak topics, trust badge and shortcuts (V3 · Step 3). */
export default async function SubjectPage({ params }: PageProps<"/subjects/[id]">) {
  const subject = findSubject((await params).id);
  if (!subject) notFound();
  const branchNames = subject.branches.includes("all")
    ? "All branches (first-year common subject)"
    : branchesOf(subject)
        .map((b) => b.name)
        .join(", ");
  const actions = [
    { href: `/?subject=${subject.id}#start`, label: "Start a lesson" },
    { href: `/mock-test?subject=${subject.id}`, label: "Mock test (several chapters)" },
    { href: `/map?subject=${subject.id}`, label: "Concept map" },
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
        <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
        <p className="text-muted">
          {branchNames} · usually semester {subject.semesters.join(" or ")}
        </p>
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
        {needsFacultyMaterial(subject) && (
          <div
            className="flex max-w-2xl flex-col gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm"
            data-testid="upload-material-note"
          >
            <p>{NON_CORE_UPLOAD_MESSAGE}</p>
            <Link
              href={`/notes?subject=${subject.id}`}
              className="w-fit rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-fg hover:bg-primary-hover"
            >
              Upload material
            </Link>
          </div>
        )}
        <nav aria-label="Shortcuts" className="flex flex-wrap gap-2">
          {actions.map((a, i) => (
            <Link
              key={a.href}
              href={a.href}
              className={
                i === 0
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
                  : "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
              }
            >
              {a.label}
            </Link>
          ))}
        </nav>
      </div>
      <SubjectProgress subjectId={subject.id} />
      <TopicImportance subjectId={subject.id} />
    </Container>
  );
}

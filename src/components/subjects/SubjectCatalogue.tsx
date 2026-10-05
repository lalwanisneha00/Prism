"use client";

import Link from "next/link";
import type { TrustTier } from "@/lib/tiers";
import { BranchSemesterBar } from "@/components/subjects/BranchSemesterBar";
import { useMyBranch } from "@/components/subjects/useMyBranch";
import { chaptersOf, findBranch, subjects, subjectsFor, type Subject } from "@/lib/subjects";

const tierLabel: Record<TrustTier, string> = {
  verified: "Verified",
  tested: "Tested",
  sourced: "Sourced",
  limited: "Limited",
};

function SubjectCard({ subject }: { subject: Subject }) {
  const chapters = chaptersOf(subject);
  const topics = chapters.reduce((n, c) => n + c.chapter.topics.length, 0);
  return (
    <li>
      <Link
        href={`/subjects/${subject.id}`}
        className="flex h-full flex-col gap-1 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
      >
        <span className="font-semibold">{subject.name}</span>
        <span className="text-sm text-muted">
          {subject.field} · {chapters.length} chapters · {topics} topics
        </span>
        <span className="text-xs text-muted">
          {tierLabel[subject.tier]} ·{" "}
          {subject.branches.includes("all")
            ? "All branches"
            : subject.branches.map((b) => findBranch(b)?.short ?? b).join(", ")}{" "}
          · Semester {subject.semesters.join(", ")}
        </span>
      </Link>
    </li>
  );
}

/** Every subject, with "my branch and semester" first. */
export function SubjectCatalogue() {
  const { mine, loaded, save } = useMyBranch();
  const mineList = mine.branch ? subjectsFor(mine.branch, mine.semester) : [];
  const semesters = [...new Set(subjects.flatMap((s) => s.semesters))].sort((a, b) => a - b);
  const branch = mine.branch ? findBranch(mine.branch) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <BranchSemesterBar mine={mine} onChange={save} />
      {loaded && branch && (
        <section
          aria-labelledby="mine-title"
          className="flex flex-col gap-3"
          data-testid="my-subjects"
        >
          <h2 id="mine-title" className="text-xl font-semibold">
            My subjects: {branch.name}
            {mine.semester ? `, semester ${mine.semester}` : ""}
          </h2>
          {mineList.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {mineList.map((s) => (
                <SubjectCard key={s.id} subject={s} />
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
              No built-in subjects for that semester yet. More branches and semesters are being
              added; meanwhile, pick any subject below.
            </p>
          )}
        </section>
      )}
      <section aria-labelledby="all-title" className="flex flex-col gap-4">
        <h2 id="all-title" className="text-xl font-semibold">
          All subjects by semester
        </h2>
        {semesters.map((sem) => (
          <div key={sem} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted uppercase">Semester {sem}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {subjects
                .filter((s) => s.semesters[0] === sem)
                .map((s) => (
                  <SubjectCard key={s.id} subject={s} />
                ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

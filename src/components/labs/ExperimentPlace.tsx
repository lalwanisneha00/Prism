"use client";

import Link from "next/link";
import { useMyBranch } from "@/components/labs/useMyBranch";
import { numberedFor } from "@/lib/labs/experiment";

type Item = { id: string; name: string; number?: number; numbers?: Record<string, number> };

/** Where an experiment sits in the student's own branch handout ("Experiment 6 of 13"). */
function useNumbered(experiments: readonly Item[], topicId: string) {
  const branch = useMyBranch();
  const list = numberedFor(experiments, branch);
  const numbered = list.filter((e) => e.number !== null);
  const at = list.findIndex((e) => e.topic.id === topicId);
  return { branch, list, numbered, at, here: list[at] };
}

export function ExperimentPosition({
  experiments,
  topicId,
}: {
  experiments: readonly Item[];
  topicId: string;
}) {
  const { branch, numbered, here } = useNumbered(experiments, topicId);
  if (!here) return null;
  if (here.number === null)
    return branch ? (
      <>Extra experiment (not in your branch&apos;s handout)</>
    ) : (
      <>Experiment from another branch&apos;s handout</>
    );
  return (
    <>
      Experiment {here.number} of {numbered.length}
    </>
  );
}

export function ExperimentNav({
  subjectId,
  experiments,
  topicId,
}: {
  subjectId: string;
  experiments: readonly Item[];
  topicId: string;
}) {
  const { list, at } = useNumbered(experiments, topicId);
  const prev = list[at - 1]?.topic;
  const next = list[at + 1]?.topic;
  const href = (id: string) => `/lab/${subjectId}/${id}`;
  return (
    <nav aria-label="Other experiments" className="flex flex-wrap justify-between gap-3 text-sm">
      {prev ? (
        <Link href={href(prev.id)} className="font-semibold text-primary underline">
          ← {prev.name.slice(0, 60)}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={href(next.id)} className="font-semibold text-primary underline">
          {next.name.slice(0, 60)} →
        </Link>
      )}
    </nav>
  );
}

import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/Container";
import { ExperimentNav, ExperimentPosition } from "@/components/labs/ExperimentPlace";
import { PracticalLoader } from "@/components/labs/PracticalLoader";
import { experimentsOf, findExperiment } from "@/lib/labs/experiment";
import { canonicalTopic } from "@/lib/syllabusFix/alias";

/*
 * A lab experiment's practical lesson (syllabus fix, Phase 7B): aim, theory, apparatus,
 * procedure, observations, calculations, result, precautions, viva, simulation and videos.
 * Rendered on request (1,600+ experiments are too many to build ahead).
 */

export async function generateMetadata({
  params,
}: PageProps<"/lab/[subject]/[topic]">): Promise<Metadata> {
  const { subject, topic } = await params;
  const found = findExperiment(subject, topic);
  return { title: found ? `${found.topic.name.slice(0, 70)} · ${found.subject.name}` : "Lab" };
}

export default async function LabPage({ params }: PageProps<"/lab/[subject]/[topic]">) {
  const { subject: subjectId, topic: topicId } = await params;
  const found = findExperiment(subjectId, topicId);
  if (!found) {
    // A merged lab's retired copy (or a hidden duplicate experiment) forwards to the one kept
    // (307: the merge can be undone).
    const moved = canonicalTopic(subjectId, topicId);
    const same = moved.subject === subjectId && moved.topic === topicId;
    if (!same && findExperiment(moved.subject, moved.topic))
      redirect(`/lab/${moved.subject}/${moved.topic}`);
    notFound();
  }
  const { subject, topic } = found;
  // Only what the numbering needs goes to the browser, which knows the student's branch.
  const experiments = experimentsOf(subject).map(({ topic: t }) => ({
    id: t.id,
    name: t.name,
    ...(t.number ? { number: t.number } : {}),
    ...(t.numbers ? { numbers: t.numbers } : {}),
  }));
  return (
    <Container className="flex flex-col gap-6 py-8 sm:py-12">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          <Link href={`/subjects/${subject.id}`} className="underline">
            {subject.name}
          </Link>{" "}
          › <ExperimentPosition experiments={experiments} topicId={topic.id} />
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{topic.name}</h1>
        {topic.aim && <p className="text-muted">Aim in your handout: {topic.aim}</p>}
      </div>
      <PracticalLoader subject={subject} topicId={topic.id} />
      <ExperimentNav subjectId={subject.id} experiments={experiments} topicId={topic.id} />
    </Container>
  );
}

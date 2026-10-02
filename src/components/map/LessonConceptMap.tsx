"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ConceptMap, type MapLayer } from "@/components/map/ConceptMap";
import { useTopicStatuses } from "@/components/map/useTopicStatuses";
import { buildGraph, gapsBefore, neighbourhood, type MapNode } from "@/lib/conceptMap";
import { lessonHref, type LessonRequest } from "@/lib/lessonRequest";
import { findChapter, findTopic } from "@/lib/subjects";

const layerLabels: Record<number, string> = {
  [-2]: "Learn before that",
  [-1]: "Learn first",
  0: "This topic",
  1: "Unlocks next",
};

/** The concept map around the current lesson: what to learn first and what comes next. */
export function LessonConceptMap({ request }: { request: LessonRequest }) {
  const statuses = useTopicStatuses();
  const graph = useMemo(() => buildGraph(request.subject), [request.subject]);
  const { layer, edges } = useMemo(
    () => neighbourhood(graph, request.topic.id),
    [graph, request.topic.id],
  );

  const layers: MapLayer[] = [-2, -1, 0, 1]
    .map((n) => ({
      label: layerLabels[n],
      nodes: [...layer]
        .filter(([, l]) => l === n)
        .map(([id]) => graph.nodes.get(id))
        .filter((node): node is MapNode => node !== undefined),
    }))
    .filter((l) => l.nodes.length > 0);

  // Open the linked topic at the same level and length as this lesson.
  const hrefFor = (node: MapNode) => {
    const chapter = findChapter(request.subject, node.chapterId);
    const topic = chapter && findTopic(chapter, node.id);
    return chapter && topic ? lessonHref({ ...request, chapter, topic }) : "/";
  };

  const gaps = gapsBefore(graph, request.topic.id, statuses)
    .map((id) => graph.nodes.get(id))
    .filter((node): node is MapNode => node !== undefined);

  if (layers.length <= 1) {
    return (
      <p className="text-muted">
        This is a starting point: it needs no other topic first.{" "}
        <Link
          href={`/map?subject=${request.subject.id}`}
          className="font-semibold text-primary underline"
        >
          See the whole subject map
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {gaps.length > 0 && (
        <p
          role="note"
          className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm"
        >
          <span className="font-semibold">Revise first: </span>
          your last quiz on{" "}
          {gaps.map((g, i) => (
            <span key={g.id}>
              {i > 0 && " and "}
              <Link href={hrefFor(g)} className="font-semibold text-primary underline">
                {g.name}
              </Link>
            </span>
          ))}{" "}
          was below 60%, and this topic builds on it.
        </p>
      )}
      <ConceptMap
        layers={layers}
        edges={edges}
        statuses={statuses}
        focusId={request.topic.id}
        hrefFor={hrefFor}
        label={`Concept map around ${request.topic.name}`}
      />
      <Link
        href={`/map?subject=${request.subject.id}`}
        className="w-fit text-sm font-semibold text-primary underline underline-offset-2"
      >
        See the whole {request.subject.name} map →
      </Link>
    </div>
  );
}

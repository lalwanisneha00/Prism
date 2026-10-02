"use client";

import { useMemo } from "react";
import { ConceptMap, type MapLayer } from "@/components/map/ConceptMap";
import { useTopicStatuses } from "@/components/map/useTopicStatuses";
import { defaultDuration } from "@/data/durations";
import { availableLevels } from "@/data/levels";
import { buildGraph, layers as layerDepths, type MapNode } from "@/lib/conceptMap";
import { lessonHref } from "@/lib/lessonRequest";
import { findChapter, findTopic, type Subject } from "@/lib/subjects";

/** The whole subject as a skill tree: start on the left (or top), advanced topics at the end. */
export function SubjectMap({ subject }: { subject: Subject }) {
  const statuses = useTopicStatuses();
  const graph = useMemo(() => buildGraph(subject), [subject]);
  const depth = useMemo(() => layerDepths(graph), [graph]);
  const maxDepth = Math.max(0, ...depth.values());

  const layers: MapLayer[] = Array.from({ length: maxDepth + 1 }, (_, d) => ({
    label: d === 0 ? "Start here" : `Step ${d + 1}`,
    nodes: [...graph.nodes.values()].filter((n) => depth.get(n.id) === d),
  }));

  const hrefFor = (node: MapNode) => {
    const chapter = findChapter(subject, node.chapterId);
    const topic = chapter && findTopic(chapter, node.id);
    return chapter && topic
      ? lessonHref({
          subject,
          chapter,
          topic,
          level: availableLevels[0],
          duration: defaultDuration,
        })
      : "/";
  };

  const mastered = [...graph.nodes.keys()].filter((id) => statuses.get(id) === "mastered").length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {graph.nodes.size} topics · {mastered} mastered. Tap any topic to start a lesson.
      </p>
      <div className="overflow-x-auto pb-2">
        <div className="md:min-w-[72rem]">
          <ConceptMap
            layers={layers}
            edges={graph.edges}
            statuses={statuses}
            hrefFor={hrefFor}
            label={`${subject.name} concept map`}
          />
        </div>
      </div>
    </div>
  );
}

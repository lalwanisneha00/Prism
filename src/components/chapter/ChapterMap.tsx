"use client";

import { useMemo } from "react";
import { ConceptMap, type MapLayer } from "@/components/map/ConceptMap";
import { useTopicStatuses } from "@/components/map/useTopicStatuses";
import { buildGraph, layers, type MapNode } from "@/lib/conceptMap";
import type { Subject } from "@/lib/subjects";

/** The chapter's concept map: its topics in layers, each arrow from a topic to what needs it. */
export function ChapterMap({
  subject,
  topicIds,
  hrefFor,
}: {
  subject: Subject;
  topicIds: string[];
  hrefFor: (topicId: string) => string;
}) {
  const statuses = useTopicStatuses();
  const graph = useMemo(() => buildGraph(subject), [subject]);
  const key = topicIds.join(",");
  const { mapLayers, edges } = useMemo(() => {
    const ids = key.split(",");
    const depth = layers(graph, ids);
    const max = Math.max(0, ...depth.values());
    const mapLayers: MapLayer[] = Array.from({ length: max + 1 }, (_, n) => ({
      label: n === 0 ? "Start here" : `Step ${n + 1}`,
      nodes: ids
        .filter((id) => depth.get(id) === n)
        .map((id) => graph.nodes.get(id))
        .filter((node): node is MapNode => node !== undefined),
    })).filter((l) => l.nodes.length > 0);
    const inside = new Set(ids);
    return { mapLayers, edges: graph.edges.filter((e) => inside.has(e.from) && inside.has(e.to)) };
  }, [graph, key]);

  return (
    <ConceptMap
      layers={mapLayers}
      edges={edges}
      statuses={statuses}
      hrefFor={(node) => hrefFor(node.id)}
      label="Concept map of this chapter lesson"
    />
  );
}

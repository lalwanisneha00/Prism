"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MapEdge, MapNode, TopicStatus } from "@/lib/conceptMap";

export type MapLayer = { label: string; nodes: MapNode[] };

const statusStyle: Record<TopicStatus, { ring: string; label: string; dot: string }> = {
  mastered: { ring: "border-success", label: "Mastered", dot: "bg-success" },
  weak: { ring: "border-danger", label: "Needs revision", dot: "bg-danger" },
  tried: { ring: "border-warning", label: "Tried", dot: "bg-warning" },
  new: { ring: "border-border", label: "Not started", dot: "bg-border" },
};

type Line = { x1: number; y1: number; x2: number; y2: number; highlight: boolean };

/**
 * A layered map of topics with arrows from each prerequisite to the topics that need it.
 * Layers run left → right on wide screens and top → bottom on phones. Every topic is a link.
 */
export function ConceptMap({
  layers,
  edges,
  statuses,
  focusId,
  hrefFor,
  label,
}: {
  layers: MapLayer[];
  edges: MapEdge[];
  statuses: Map<string, TopicStatus>;
  focusId?: string;
  hrefFor: (node: MapNode) => string;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const active = hovered ?? focusId ?? null;

  // Arrows are drawn from the real positions of the cards, re-measured on every resize.
  const measure = () => {
    const root = box.current;
    if (!root) return;
    const base = root.getBoundingClientRect();
    // On phones the layers stack and wrap, so arrows would cross the cards: we show "↓"
    // between layers instead and draw arrows only on wide screens.
    const horizontal = window.matchMedia("(min-width: 768px)").matches;
    const pos = new Map<string, DOMRect>();
    root.querySelectorAll<HTMLElement>("[data-node]").forEach((el) => {
      pos.set(el.dataset.node!, el.getBoundingClientRect());
    });
    const next: Line[] = [];
    for (const e of horizontal ? edges : []) {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) continue;
      next.push({
        x1: a.right - base.left,
        y1: a.top + a.height / 2 - base.top,
        x2: b.left - base.left,
        y2: b.top + b.height / 2 - base.top,
        highlight: e.from === active || e.to === active,
      });
    }
    setLines(next);
    setSize({ w: base.width, h: base.height });
  };
  const measureRef = useRef(measure);
  useEffect(() => {
    measureRef.current = measure;
  });

  useLayoutEffect(() => {
    measureRef.current();
  }, [layers, edges, active]);

  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const observer = new ResizeObserver(() => measureRef.current());
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="flex flex-col gap-3">
      <div ref={box} className="relative" role="group" aria-label={label}>
        <svg
          aria-hidden="true"
          width={size.w}
          height={size.h}
          className="pointer-events-none absolute inset-0"
        >
          <defs>
            <marker
              id="map-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" />
            </marker>
            <marker
              id="map-arrow-hi"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--primary)" />
            </marker>
          </defs>
          {lines.map((l, i) => {
            const horizontal = Math.abs(l.x2 - l.x1) > Math.abs(l.y2 - l.y1);
            const mx = (l.x1 + l.x2) / 2;
            const my = (l.y1 + l.y2) / 2;
            const d = horizontal
              ? `M${l.x1},${l.y1} C${mx},${l.y1} ${mx},${l.y2} ${l.x2},${l.y2}`
              : `M${l.x1},${l.y1} C${l.x1},${my} ${l.x2},${my} ${l.x2},${l.y2}`;
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={l.highlight ? "var(--primary)" : "var(--muted)"}
                strokeOpacity={l.highlight ? 0.95 : 0.35}
                strokeWidth={l.highlight ? 2.5 : 1.5}
                markerEnd={`url(#${l.highlight ? "map-arrow-hi" : "map-arrow"})`}
              />
            );
          })}
        </svg>
        <ol className="relative flex flex-col gap-8 md:flex-row md:gap-12">
          {layers.map((layer, i) => (
            <li key={layer.label} className="flex min-w-0 flex-1 flex-col gap-2">
              {i > 0 && (
                <span aria-hidden="true" className="-mt-6 text-center text-lg text-muted md:hidden">
                  ↓
                </span>
              )}
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                {layer.label}
              </p>
              <ul className="flex flex-wrap gap-2 md:flex-col">
                {layer.nodes.map((node) => {
                  const status = statuses.get(node.id) ?? "new";
                  const isFocus = node.id === focusId;
                  return (
                    <li key={node.id} data-node={node.id}>
                      {isFocus ? (
                        <span
                          aria-current="page"
                          className="flex items-center gap-2 rounded-xl border-2 border-primary bg-primary-soft px-3 py-2 text-sm font-semibold text-primary"
                        >
                          <span aria-hidden="true">📍</span>
                          {node.name}
                        </span>
                      ) : (
                        <Link
                          href={hrefFor(node)}
                          onMouseEnter={() => setHovered(node.id)}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered(node.id)}
                          onBlur={() => setHovered(null)}
                          className={`flex items-center gap-2 rounded-xl border-2 bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${statusStyle[status].ring}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`size-2 shrink-0 rounded-full ${statusStyle[status].dot}`}
                          />
                          <span>{node.name}</span>
                          <span className="sr-only">({statusStyle[status].label})</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {(Object.keys(statusStyle) as TopicStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2 rounded-full ${statusStyle[s].dot}`} />
            {statusStyle[s].label}
          </span>
        ))}
        <span>· Arrows point from what to learn first to what it unlocks.</span>
      </figcaption>
    </figure>
  );
}

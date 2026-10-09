"use client";

import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MapEdge, MapNode, TopicStatus } from "@/lib/conceptMap";

export type MapLayer = { label: string; nodes: MapNode[] };

const statusStyle: Record<TopicStatus, { ring: string; tint: string; label: string; dot: string }> =
  {
    mastered: {
      ring: "border-success",
      tint: "bg-success/10",
      label: "Mastered",
      dot: "bg-success",
    },
    weak: {
      ring: "border-danger",
      tint: "bg-danger/10",
      label: "Needs revision",
      dot: "bg-danger",
    },
    tried: { ring: "border-warning", tint: "bg-warning/10", label: "Tried", dot: "bg-warning" },
    new: { ring: "border-border", tint: "bg-surface", label: "Not started", dot: "bg-muted/50" },
  };

/** A thin vertical connector with an arrowhead between two layers (phones; wide screens draw curved arrows). */
function Connector() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 32"
      width="12"
      height="32"
      className="my-1 shrink-0 text-muted md:hidden"
    >
      <line x1="6" y1="0" x2="6" y2="24" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 21 6 30l4.5-9z" fill="currentColor" />
    </svg>
  );
}

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
        <ol className="relative flex flex-col items-stretch gap-0 md:flex-row md:gap-12">
          {layers.map((layer, i) => (
            <li
              key={layer.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-2 md:items-stretch"
            >
              {i > 0 && <Connector />}
              <p className="text-center text-xs font-semibold tracking-wide text-muted uppercase md:text-left">
                {layer.label}
              </p>
              <ul className="flex w-full flex-wrap justify-center gap-2 md:flex-col md:justify-start">
                {layer.nodes.map((node, n) => {
                  const status = statuses.get(node.id) ?? "new";
                  const isFocus = node.id === focusId;
                  return (
                    <li
                      key={node.id}
                      data-node={node.id}
                      className="map-node-in flex w-[min(100%,20rem)] justify-center md:w-auto md:justify-start"
                      style={{ animationDelay: `${(i * 2 + n) * 70}ms` }}
                    >
                      {isFocus ? (
                        <span
                          aria-current="page"
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-primary-soft px-5 py-3.5 text-center text-base font-semibold text-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent)] md:w-auto md:justify-start md:px-4 md:py-2.5 md:text-left md:text-sm"
                        >
                          <Icon name="pin" />
                          {node.name}
                        </span>
                      ) : (
                        <Link
                          href={hrefFor(node)}
                          onMouseEnter={() => setHovered(node.id)}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered(node.id)}
                          onBlur={() => setHovered(null)}
                          className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-center text-sm font-medium transition-transform hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] active:bg-surface-2 md:w-auto md:justify-start md:py-2 md:text-left ${statusStyle[status].ring} ${statusStyle[status].tint}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`size-2 shrink-0 rounded-full ${statusStyle[status].dot}`}
                          />
                          <span className="min-w-0 text-balance">{node.name}</span>
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
      <figcaption className="flex flex-col items-center gap-2 text-xs text-muted">
        <ul className="flex flex-wrap justify-center gap-2">
          {(Object.keys(statusStyle) as TopicStatus[]).map((st) => (
            <li
              key={st}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1"
            >
              <span aria-hidden="true" className={`size-2 rounded-full ${statusStyle[st].dot}`} />
              {statusStyle[st].label}
            </li>
          ))}
        </ul>
        <p className="text-center">Arrows point from what to learn first to what it unlocks.</p>
      </figcaption>
    </figure>
  );
}

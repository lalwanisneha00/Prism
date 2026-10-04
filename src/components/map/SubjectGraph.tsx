"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { PathPanel, topicLessonHref } from "@/components/map/PathPanel";
import { useTopicStatuses } from "@/components/map/useTopicStatuses";
import type { TopicStatus } from "@/lib/conceptMap";
import { layoutGraph, type LaidNode } from "@/lib/graph/layout";
import { graphOf, graphProblems, studyOrder, unlocks } from "@/lib/graph/prereqGraph";
import type { Subject } from "@/lib/subjects";

/*
 * The subject concept map (fix before V3 · Step 5). Hover, focus or tap a topic: it and every
 * topic to study before it light up, numbered in study order, with their arrows; the rest
 * fades. Click (or tap) pins the highlight; a second click opens the topic. Chapters are
 * shaded bands that can be collapsed. Zoom, pan, fit and search help on big subjects.
 */

const statusStyle: Record<TopicStatus, { dot: string; label: string }> = {
  mastered: { dot: "bg-success", label: "Done" },
  tried: { dot: "bg-warning", label: "In progress" },
  weak: { dot: "bg-danger", label: "Weak" },
  new: { dot: "bg-border", label: "Not started" },
};

type View = { x: number; y: number; k: number };
const MIN_K = 0.15;
/** The smallest zoom at which labels are still readable: the map starts no smaller. */
const READABLE_K = 0.75;
const MAX_K = 2;

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

export function SubjectGraph({ subject }: { subject: Subject }) {
  const router = useRouter();
  const statuses = useTopicStatuses();
  const problems = useMemo(() => graphProblems(subject), [subject]);
  const graph = useMemo(() => graphOf(subject), [subject]);
  const vertical = useNarrow();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const layout = useMemo(
    () => layoutGraph(graph, { vertical, collapsed }),
    [graph, vertical, collapsed],
  );

  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [query, setQuery] = useState("");
  const viewport = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());

  const chapterOf = useMemo(() => new Map(graph.topics.map((t) => [t.id, t.chapterId])), [graph]);
  const shownId = useCallback(
    (id: string) => (collapsed.has(chapterOf.get(id) ?? "") ? `chapter:${chapterOf.get(id)}` : id),
    [collapsed, chapterOf],
  );

  // The selected topic: pinned wins over hover/focus.
  const active = pinned ?? hovered;
  const activeTopic = active && !active.startsWith("chapter:") ? active : null;
  const order = useMemo(
    () => (activeTopic ? studyOrder(graph, activeTopic) : []),
    [graph, activeTopic],
  );
  const number = useMemo(() => new Map(order.map((id, i) => [id, i + 1])), [order]);
  const lit = useMemo(() => new Set(order.map(shownId)), [order, shownId]);
  const next = useMemo(
    () => (activeTopic ? unlocks(graph, activeTopic) : []),
    [graph, activeTopic],
  );

  const fit = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const k = Math.max(
      MIN_K,
      Math.min(1, (el.clientWidth - 16) / layout.width, (el.clientHeight - 16) / layout.height),
    );
    setView({
      k,
      x: (el.clientWidth - layout.width * k) / 2,
      y: Math.max(8, (el.clientHeight - layout.height * k) / 2),
    });
  }, [layout.width, layout.height]);

  // Start where the subject starts, at a readable size: the whole map if it fits that way,
  // otherwise its beginning (top left). "Fit to screen" shows everything, however small.
  const start = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const fitK = Math.min(
      1,
      (el.clientWidth - 16) / layout.width,
      (el.clientHeight - 16) / layout.height,
    );
    if (fitK >= READABLE_K) return fit();
    setView({ k: READABLE_K, x: 8, y: 8 });
  }, [fit, layout.width, layout.height]);
  useEffect(() => {
    const frame = requestAnimationFrame(start);
    return () => cancelAnimationFrame(frame);
  }, [start]);

  const zoom = (factor: number, cx?: number, cy?: number) =>
    setView((v) => {
      const el = viewport.current;
      const px = cx ?? (el ? el.clientWidth / 2 : 0);
      const py = cy ?? (el ? el.clientHeight / 2 : 0);
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      return { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k };
    });

  const centerOn = useCallback(
    (id: string) => {
      const n = layout.nodes.find((x) => x.id === id);
      const el = viewport.current;
      if (!n || !el) return;
      setView((v) => ({
        k: v.k,
        x: el.clientWidth / 2 - (n.x + n.w / 2) * v.k,
        y: el.clientHeight / 2 - (n.y + n.h / 2) * v.k,
      }));
    },
    [layout.nodes],
  );

  // Esc clears the highlight.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setPinned(null);
        setHovered(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Panning by dragging the background; pinch to zoom with two fingers; ctrl/⌘ + wheel zooms.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const all = [...pointers.current.entries()];
    if (all.length === 2) {
      const other = all.find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const rect = viewport.current!.getBoundingClientRect();
      if (before > 0)
        zoom(
          after / before,
          (e.clientX + other.x) / 2 - rect.left,
          (e.clientY + other.y) / 2 - rect.top,
        );
    } else {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    // A click on empty space (not a drag) clears the pinned highlight.
    if (
      !moved.current &&
      pointers.current.size === 0 &&
      !(e.target as HTMLElement).closest("button")
    ) {
      setPinned(null);
    }
  };
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function activate(n: LaidNode) {
    if (n.kind === "chapter") {
      setCollapsed((c) => {
        const s = new Set(c);
        s.delete(n.chapterId);
        return s;
      });
      return;
    }
    // First click/tap pins the path; clicking the pinned topic again opens it.
    if (pinned === n.id) router.push(topicLessonHref(subject.id, n.chapterId, n.id));
    else setPinned(n.id);
  }

  // Arrow keys move focus to the nearest topic in that direction.
  function onNodeKey(e: KeyboardEvent<HTMLButtonElement>, n: LaidNode) {
    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[
      e.key
    ];
    if (!dir) return;
    e.preventDefault();
    const cx = n.x + n.w / 2;
    const cy = n.y + n.h / 2;
    let best: LaidNode | null = null;
    let bestScore = Infinity;
    for (const m of layout.nodes) {
      if (m.id === n.id) continue;
      const dx = m.x + m.w / 2 - cx;
      const dy = m.y + m.h / 2 - cy;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 0) continue;
      const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }
    if (best) {
      nodeRefs.current.get(best.id)?.focus();
      centerOn(best.id);
    }
  }

  const matches = query.trim()
    ? graph.topics
        .filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 6)
    : [];
  function jumpTo(id: string) {
    const chapter = chapterOf.get(id);
    if (chapter && collapsed.has(chapter)) {
      setCollapsed((c) => {
        const s = new Set(c);
        s.delete(chapter);
        return s;
      });
    }
    setPinned(id);
    setQuery("");
    requestAnimationFrame(() => centerOn(id));
  }

  if (problems.length) {
    return (
      <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/5 p-5 text-sm">
        <p className="font-semibold">
          This subject&apos;s map can&apos;t be drawn: its prerequisite data has problems.
        </p>
        <ul className="mt-2 list-disc pl-5">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    );
  }

  const nodeState = (id: string) =>
    !active ? "normal" : id === shownId(active) ? "active" : lit.has(id) ? "path" : "faded";
  const done = graph.topics.filter((t) => statuses.get(t.id) === "mastered").length;

  return (
    <div className="flex flex-col gap-3" data-testid="subject-graph">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) jumpTo(matches[0].id);
            }}
            placeholder="Find a topic"
            aria-label="Find a topic on the map"
            className="w-48 rounded-full border border-border bg-surface px-3 py-1.5"
          />
          {matches.length > 0 && (
            <ul className="absolute z-30 mt-1 w-64 rounded-xl border border-border bg-surface p-1 shadow-lg">
              {matches.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(t.id)}
                    className="w-full rounded-lg px-2 py-1 text-left hover:bg-surface-2"
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => zoom(1 / 1.25)}
          aria-label="Zoom out"
          className="size-8 rounded-full border border-border font-semibold hover:bg-surface-2"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => zoom(1.25)}
          aria-label="Zoom in"
          className="size-8 rounded-full border border-border font-semibold hover:bg-surface-2"
        >
          +
        </button>
        <button
          type="button"
          onClick={fit}
          className="rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-surface-2"
        >
          Fit to screen
        </button>
        <button
          type="button"
          onClick={() =>
            setCollapsed((c) =>
              c.size === graph.chapters.length
                ? new Set()
                : new Set(graph.chapters.map((x) => x.id)),
            )
          }
          className="rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-surface-2"
        >
          {collapsed.size === graph.chapters.length
            ? "Expand all chapters"
            : "Collapse all chapters"}
        </button>
        <span className="text-muted">
          {graph.topics.length} topics · {done} done
        </span>
      </div>

      <ul className="flex flex-wrap gap-3 text-xs text-muted" aria-label="Legend">
        {(Object.keys(statusStyle) as TopicStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${statusStyle[s].dot}`} />
            {statusStyle[s].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border-2 border-primary" /> Selected path (numbered)
        </li>
      </ul>

      <div className="grid gap-3 md:grid-cols-[1fr_18rem]">
        <div
          ref={viewport}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onMouseLeave={() => setHovered(null)}
          className="relative h-[65vh] min-h-80 cursor-grab touch-none overflow-hidden rounded-2xl border border-border bg-surface-2/40 select-none active:cursor-grabbing md:h-[620px]"
          data-testid="graph-viewport"
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            }}
          >
            <svg
              width={layout.width}
              height={layout.height}
              className="absolute inset-0"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="arrow-muted"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" className="fill-muted/50" />
                </marker>
                <marker
                  id="arrow-lit"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" className="fill-primary" />
                </marker>
              </defs>
              {layout.bands.map((b, i) => (
                <rect
                  key={b.chapterId}
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx={14}
                  className={i % 2 ? "fill-primary/5" : "fill-surface"}
                />
              ))}
              {layout.edges.map((e) => {
                const on = active !== null && lit.has(e.from) && lit.has(e.to);
                return (
                  <path
                    key={`${e.from}>${e.to}`}
                    d={e.d}
                    fill="none"
                    data-edge={`${e.from}>${e.to}`}
                    data-state={!active ? "normal" : on ? "path" : "faded"}
                    markerEnd={on ? "url(#arrow-lit)" : "url(#arrow-muted)"}
                    className={`motion-safe:transition-opacity ${
                      on ? "stroke-primary" : "stroke-muted/40"
                    } ${active && !on ? "opacity-10" : ""}`}
                    strokeWidth={on ? 2.5 : 1.2}
                  />
                );
              })}
            </svg>
            {layout.bands.map((b) => (
              <button
                key={`label-${b.chapterId}`}
                type="button"
                onClick={() =>
                  setCollapsed((c) => {
                    const s = new Set(c);
                    if (s.has(b.chapterId)) s.delete(b.chapterId);
                    else s.add(b.chapterId);
                    return s;
                  })
                }
                aria-expanded={!b.collapsed}
                className="absolute z-10 max-w-60 truncate rounded-full px-2 py-0.5 text-left text-xs font-semibold text-muted hover:bg-surface-2"
                style={{ left: b.x + 8, top: b.y + 4 }}
                title={b.collapsed ? "Expand this chapter" : "Collapse this chapter"}
              >
                {b.collapsed ? "▸" : "▾"} {b.label}
              </button>
            ))}
            {layout.nodes.map((n) => {
              const state = nodeState(n.id);
              const status = n.kind === "topic" ? (statuses.get(n.id) ?? "new") : null;
              const num = number.get(n.id);
              return (
                <button
                  key={n.id}
                  ref={(el) => {
                    if (el) nodeRefs.current.set(n.id, el);
                    else nodeRefs.current.delete(n.id);
                  }}
                  type="button"
                  data-node={n.id}
                  data-state={state}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered((h) => (h === n.id ? null : h))}
                  onFocus={() => setHovered(n.id)}
                  onBlur={() => setHovered((h) => (h === n.id ? null : h))}
                  onClick={() => activate(n)}
                  onKeyDown={(e) => onNodeKey(e, n)}
                  aria-pressed={pinned === n.id}
                  aria-label={
                    n.kind === "chapter"
                      ? `${n.label}: ${n.count} topics (collapsed). Expand.`
                      : `${n.label}${num ? `, step ${num} of ${order.length}` : ""}${status ? `, ${statusStyle[status].label}` : ""}`
                  }
                  className={`absolute flex items-center gap-2 rounded-xl border bg-surface px-2.5 text-left text-xs leading-tight shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-opacity ${
                    state === "active"
                      ? "border-primary ring-4 ring-primary/30"
                      : state === "path"
                        ? "border-2 border-primary"
                        : "border-border"
                  } ${state === "faded" ? "opacity-20" : ""} ${n.kind === "chapter" ? "border-dashed font-semibold" : ""}`}
                  style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
                >
                  {num ? (
                    <span
                      className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-fg"
                      data-step={num}
                    >
                      {num}
                    </span>
                  ) : status ? (
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${statusStyle[status].dot}`}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="line-clamp-3 min-w-0">
                    {n.label}
                    {n.kind === "chapter" ? ` (${n.count} topics)` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <PathPanel
          subject={subject}
          graph={graph}
          selected={activeTopic}
          order={order}
          next={next}
          statuses={statuses}
        />
      </div>
      <p className="text-xs text-muted">
        Hover or Tab to a topic to see its path; click or tap to pin it, again to open it. Esc or a
        click on empty space clears it. Drag to pan; use + / − (or Ctrl + wheel, or pinch) to zoom.
      </p>
    </div>
  );
}

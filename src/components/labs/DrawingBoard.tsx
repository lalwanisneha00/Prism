"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Markdown } from "@/components/lesson/Markdown";
import { arcPath, type Drawing, type LineStyle, type Shape } from "@/lib/labs/drawing";

/*
 * An engineering drawing built step by step (syllabus fix, Phase 7C). Each step's lines are drawn
 * one after another with a moving pen, like watching someone draw; "still" shows the finished
 * drawing (workshop job drawings). Line types follow drawing conventions.
 */

const STYLE: Record<LineStyle, { width: number; dash?: string; colour: string }> = {
  object: { width: 0.9, colour: "var(--fg)" },
  thin: { width: 0.4, colour: "var(--fg)" },
  hidden: { width: 0.6, dash: "3 1.5", colour: "var(--fg)" },
  center: { width: 0.4, dash: "8 1.5 1.5 1.5", colour: "var(--fg)" },
  construction: { width: 0.3, colour: "var(--muted)" },
};

const PEN_MS = 450;

function dimension(s: Extract<Shape, { type: "dim" }>, key: string) {
  const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
  const u = { x: (s.x2 - s.x1) / len, y: (s.y2 - s.y1) / len };
  const n = { x: -u.y, y: u.x };
  const o = s.offset;
  const a = { x: s.x1 + n.x * o, y: s.y1 + n.y * o };
  const b = { x: s.x2 + n.x * o, y: s.y2 + n.y * o };
  const ext = Math.sign(o || 1) * 1.5;
  let angle = (Math.atan2(u.y, u.x) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle -= 180;
  const mid = {
    x: (a.x + b.x) / 2 + n.x * 2.5 * Math.sign(o || 1),
    y: (a.y + b.y) / 2 + n.y * 2.5 * Math.sign(o || 1),
  };
  return (
    <g key={key} stroke="var(--primary)" strokeWidth={0.3} fill="none">
      <path
        d={`M${s.x1} ${s.y1}L${a.x + n.x * ext} ${a.y + n.y * ext}M${s.x2} ${s.y2}L${b.x + n.x * ext} ${b.y + n.y * ext}`}
      />
      <path
        d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
        markerStart="url(#dim-arrow)"
        markerEnd="url(#dim-arrow)"
      />
      <text
        x={mid.x}
        y={mid.y}
        fontSize={4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--primary)"
        stroke="none"
        transform={`rotate(${angle} ${mid.x} ${mid.y})`}
      >
        {s.text}
      </text>
    </g>
  );
}

function shapeNode(s: Shape, key: string, pen: { delay: number } | null): ReactNode {
  if (s.type === "dim") return dimension(s, key);
  if (s.type === "text")
    return (
      <text
        key={key}
        x={s.x}
        y={s.y}
        fontSize={5}
        fontWeight={600}
        fill="var(--fg)"
        className={pen ? "draw-fade" : undefined}
        style={pen ? { animationDelay: `${pen.delay}ms` } : undefined}
      >
        {s.text}
      </text>
    );
  const st = STYLE[s.style];
  const common = {
    fill: "none",
    stroke: st.colour,
    strokeWidth: st.width,
    strokeLinecap: "round" as const,
  };
  // A moving pen for solid lines; dashed lines fade in (a pen trick would hide their dashes).
  const animate = pen
    ? st.dash
      ? { className: "draw-fade" }
      : { className: "draw-pen", pathLength: 1 }
    : {};
  const style = pen ? { animationDelay: `${pen.delay}ms` } : undefined;
  const dash = pen && !st.dash ? undefined : st.dash;
  switch (s.type) {
    case "line":
      return (
        <line
          key={key}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          {...common}
          strokeDasharray={dash}
          {...animate}
          style={style}
        />
      );
    case "circle":
      return (
        <circle
          key={key}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          {...common}
          strokeDasharray={dash}
          {...animate}
          style={style}
        />
      );
    case "arc":
      return (
        <path
          key={key}
          d={arcPath(s.cx, s.cy, s.r, s.start, s.end)}
          {...common}
          strokeDasharray={dash}
          {...animate}
          style={style}
        />
      );
    case "polyline": {
      const d =
        s.points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") + (s.closed ? "Z" : "");
      return <path key={key} d={d} {...common} strokeDasharray={dash} {...animate} style={style} />;
    }
  }
}

export function DrawingBoard({ drawing, still = false }: { drawing: Drawing; still?: boolean }) {
  const last = drawing.steps.length - 1;
  const [step, setStep] = useState(still ? last : 0);
  const [playing, setPlaying] = useState(false);
  // Re-run the pen animation each time a step is shown.
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const ms = drawing.steps[step].shapes.length * PEN_MS + 1200;
    const timer = setTimeout(() => {
      if (step >= last) setPlaying(false);
      else {
        setStep(step + 1);
        setRun((r) => r + 1);
      }
    }, ms);
    return () => clearTimeout(timer);
  }, [playing, step, last, drawing.steps]);

  const go = (to: number) => {
    setStep(Math.max(0, Math.min(last, to)));
    setRun((r) => r + 1);
  };

  return (
    <div className="flex flex-col gap-3" data-testid="drawing-board">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <svg
          viewBox={`0 0 ${drawing.width} ${drawing.height}`}
          className="block w-full"
          role="img"
          aria-label={drawing.steps
            .slice(0, step + 1)
            .map((s) => s.text)
            .join(" ")}
        >
          <style>{`.draw-pen { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw-pen ${PEN_MS}ms ease forwards; } .draw-fade { opacity: 0; animation: draw-fade ${PEN_MS}ms ease forwards; } @keyframes draw-pen { to { stroke-dashoffset: 0; } } @keyframes draw-fade { to { opacity: 1; } } @media (prefers-reduced-motion: reduce) { .draw-pen, .draw-fade { animation: none; stroke-dashoffset: 0; opacity: 1; } }`}</style>
          <defs>
            <marker
              id="dim-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M0 2L10 5L0 8z" fill="var(--primary)" />
            </marker>
          </defs>
          <rect
            x={1}
            y={1}
            width={drawing.width - 2}
            height={drawing.height - 2}
            fill="none"
            stroke="var(--border)"
            strokeWidth={0.5}
          />
          {drawing.steps.slice(0, step + 1).map((s, i) => (
            <g key={i === step ? `now-${run}` : i}>
              {s.shapes.map((shape, j) =>
                shapeNode(shape, `${i}-${j}`, i === step && !still ? { delay: j * PEN_MS } : null),
              )}
            </g>
          ))}
        </svg>
      </div>
      {still ? (
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
          {drawing.steps.map((s, i) => (
            <li key={i}>
              <Markdown>{s.text}</Markdown>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <div
            className="rounded-xl border border-primary/40 bg-primary-soft/40 p-3"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-muted">
              Step {step + 1} of {drawing.steps.length}
            </p>
            <Markdown>{drawing.steps[step].text}</Markdown>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => go(step - 1)}
              disabled={step === 0}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => go(step + 1)}
              disabled={step === last}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Next step →
            </button>
            <button
              type="button"
              onClick={() => {
                if (!playing && step === last) go(0);
                setPlaying((p) => !p);
              }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
            >
              {playing ? "Pause" : "Play the construction"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

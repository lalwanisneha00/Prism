"use client";

import { useId, type ReactNode } from "react";

/** The frame every widget sits in: title, picture, controls, readouts and caption. */
export function WidgetShell({
  title,
  caption,
  children,
  controls,
  readouts,
}: {
  title: string;
  caption: string;
  children: ReactNode;
  controls?: ReactNode;
  readouts?: ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:p-4">
      <p className="text-sm font-semibold">
        <span aria-hidden="true">⚡ </span>
        {title} <span className="font-normal text-muted">· interactive</span>
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">{children}</div>
      {readouts && <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">{readouts}</dl>}
      {controls && <div className="grid gap-3 sm:grid-cols-2">{controls}</div>}
      <figcaption className="text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}

export function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface px-2.5 py-1.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-sm font-semibold">{value}</dd>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  format = (v) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono font-semibold">
          {format(value)} {unit}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </div>
  );
}

export function WidgetButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {children}
    </button>
  );
}

/** Maps world coordinates (y up) onto an SVG viewBox (y down). */
export function makeScale(
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
  width: number,
  height: number,
) {
  const sx = (x: number) => ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * width;
  const sy = (y: number) => height - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * height;
  const ux = (px: number) => bounds.xMin + (px / width) * (bounds.xMax - bounds.xMin);
  const uy = (py: number) => bounds.yMin + ((height - py) / height) * (bounds.yMax - bounds.yMin);
  return { sx, sy, ux, uy };
}

export const chargeColor = (q: number) => (q > 0 ? "#e1306c" : "#3b82f6");

/** An arrowhead marker of fixed size (not scaled by line width); use markerEnd="url(#id)". */
export function ArrowMarker({
  id,
  color,
  size = 12,
}: {
  id: string;
  color: string;
  size?: number;
}) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerUnits="userSpaceOnUse"
      markerWidth={size}
      markerHeight={size}
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 z" fill={color} />
    </marker>
  );
}

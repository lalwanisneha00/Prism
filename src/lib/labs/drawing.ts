import { z } from "zod";

/*
 * Engineering drawings as data (syllabus fix, Phase 7C): constructions in Engineering Graphics
 * labs and job drawings in workshop labs. The AI lists shapes in millimetres on a sheet, grouped
 * into steps; Prism draws them, one line at a time, like watching someone draw.
 */

const n = z.number().finite();
const LINE_STYLES = ["object", "thin", "hidden", "center", "construction"] as const;
/** An unknown style name ("thick", "dashed") becomes a plain visible edge rather than a failure. */
const style = z.enum(LINE_STYLES).catch("object").default("object");

export const ShapeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("line"), x1: n, y1: n, x2: n, y2: n, style }),
  z.object({ type: z.literal("circle"), cx: n, cy: n, r: z.number().positive(), style }),
  z.object({
    type: z.literal("arc"),
    cx: n,
    cy: n,
    r: z.number().positive(),
    /** Degrees, anticlockwise from the +x axis. */
    start: n,
    end: n,
    style,
  }),
  z.object({
    type: z.literal("polyline"),
    /** [[x, y], ...]; "x,y x,y" text is accepted too. */
    points: z.preprocess(
      (v) =>
        typeof v === "string"
          ? v
              .trim()
              .split(/\s+/)
              .map((pair) => pair.split(",").map(Number))
          : v,
      z
        .array(z.tuple([n, n]))
        .min(2)
        .max(40),
    ),
    closed: z.boolean().optional(),
    style,
  }),
  z.object({
    type: z.literal("text"),
    x: n,
    y: n,
    text: z.string().trim().min(1).max(30),
  }),
  z.object({
    type: z.literal("dim"),
    x1: n,
    y1: n,
    x2: n,
    y2: n,
    text: z.string().trim().min(1).max(20),
    /** How far the dimension line sits from the measured edge (mm, either side). */
    offset: n.default(8),
  }),
]);
export type Shape = z.infer<typeof ShapeSchema>;
export type LineStyle = (typeof LINE_STYLES)[number];

export const DrawingSchema = z.object({
  /** Sheet size in mm (y grows downward, as on paper seen from the top-left). */
  width: z.number().min(40).max(420),
  height: z.number().min(40).max(300),
  steps: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(300),
        // A shape the AI left incomplete (a missing coordinate) is dropped, not the whole lesson.
        shapes: z.preprocess(
          (v) => (Array.isArray(v) ? v.filter((s) => ShapeSchema.safeParse(s).success) : v),
          z.array(ShapeSchema).min(1).max(30),
        ),
      }),
    )
    .min(1)
    .max(20),
});
export type Drawing = z.infer<typeof DrawingSchema>;

/** Points a shape touches, for the bounds check. */
function pointsOf(s: Shape): [number, number][] {
  switch (s.type) {
    case "line":
    case "dim":
      return [
        [s.x1, s.y1],
        [s.x2, s.y2],
      ];
    case "circle":
    case "arc":
      return [
        [s.cx - s.r, s.cy - s.r],
        [s.cx + s.r, s.cy + s.r],
      ];
    case "polyline":
      return s.points;
    case "text":
      return [[s.x, s.y]];
  }
}

export function drawingProblems(d: Drawing): string[] {
  const problems: string[] = [];
  const total = d.steps.reduce((sum, s) => sum + s.shapes.length, 0);
  if (total > 150) problems.push(`the drawing has ${total} shapes; keep it under 150`);
  d.steps.forEach((step, i) =>
    step.shapes.forEach((s, j) => {
      const out = pointsOf(s).some(
        ([x, y]) => x < -1 || y < -1 || x > d.width + 1 || y > d.height + 1,
      );
      if (out)
        problems.push(
          `steps.${i}.shapes.${j}: the ${s.type} goes outside the ${d.width} × ${d.height} mm sheet`,
        );
      if (s.type === "line" && s.x1 === s.x2 && s.y1 === s.y2)
        problems.push(`steps.${i}.shapes.${j}: a line with zero length`);
    }),
  );
  return problems;
}

/** SVG path for an arc (degrees anticlockwise, y down on screen). */
export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  let sweep = end - start;
  while (sweep <= 0) sweep += 360;
  const x1 = cx + r * Math.cos(rad(start));
  const y1 = cy - r * Math.sin(rad(start));
  const x2 = cx + r * Math.cos(rad(start + sweep));
  const y2 = cy - r * Math.sin(rad(start + sweep));
  return `M ${x1} ${y1} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${x2} ${y2}`;
}

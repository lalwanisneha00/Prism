import { isWidgetId, widgetRegistry } from "@/visuals/registry";

/*
 * An interactive widget cannot move on paper, so a slide shows it as a short sequence of fixed
 * pictures: where it starts, one setting changed, and the limiting case. The settings come
 * from the widget's own parameter limits (never invented), and each picture gets a caption
 * saying what changed and what to look for. Every state is checked against the widget's
 * schema before it is drawn.
 */

export type WidgetState = {
  label: "Starting point" | "One setting changed" | "Limiting case";
  params: Record<string, unknown>;
  caption: string;
};

type NumberBounds = { min: number; max: number };

function asNumberBounds(schema: unknown): NumberBounds | null {
  const s = schema as { minValue?: number | null; maxValue?: number | null; type?: string };
  if (s?.type !== "number") return null;
  if (typeof s.minValue !== "number" || typeof s.maxValue !== "number") return null;
  return { min: s.minValue, max: s.maxValue };
}

function shapeOf(schema: unknown): Record<string, unknown> | null {
  const s = schema as { shape?: Record<string, unknown> };
  return s?.shape && typeof s.shape === "object" ? s.shape : null;
}

/** A readable name for a parameter ("areaCm2" → "area cm2"). */
export function paramLabel(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
}

const round = (n: number) => Math.round(n * 1000) / 1000;

type Target = { path: [string] | [string, number, string]; bounds: NumberBounds; label: string };

/** The numbers a student could change: top-level numeric params, else the first charge-like item's fields. */
function targets(schema: unknown, params: Record<string, unknown>): Target[] {
  const shape = shapeOf(schema);
  if (!shape) return [];
  const out: Target[] = [];
  for (const [name, field] of Object.entries(shape)) {
    const bounds = asNumberBounds(field);
    if (bounds && typeof params[name] === "number") {
      out.push({ path: [name], bounds, label: paramLabel(name) });
    }
  }
  if (out.length > 0) return out;
  for (const [name, field] of Object.entries(shape)) {
    const list = params[name];
    const element = (field as { element?: unknown }).element;
    if (!Array.isArray(list) || list.length === 0 || !element) continue;
    const inner = shapeOf(element);
    if (!inner) continue;
    for (const [key, f] of Object.entries(inner)) {
      const bounds = asNumberBounds(f);
      if (bounds && typeof (list[0] as Record<string, unknown>)?.[key] === "number") {
        out.push({ path: [name, 0, key], bounds, label: `${paramLabel(key)} of the first item` });
      }
    }
  }
  return out;
}

function withValue(
  params: Record<string, unknown>,
  t: Target,
  value: number,
): Record<string, unknown> {
  if (t.path.length === 1) return { ...params, [t.path[0]]: value };
  const [name, index, key] = t.path;
  const list = [...(params[name] as Record<string, unknown>[])];
  list[index] = { ...list[index], [key]: value };
  return { ...params, [name]: list };
}

function valueOf(params: Record<string, unknown>, t: Target): number {
  if (t.path.length === 1) return params[t.path[0]] as number;
  const [name, index, key] = t.path;
  return (params[name] as Record<string, number>[])[index][key];
}

/** Moves a value to the far end of its range from where it is, nudged off any forbidden zero. */
function farEnd(current: number, b: NumberBounds): number {
  const mid = (b.min + b.max) / 2;
  const target = current <= mid ? b.max : b.min;
  return round(target);
}

/** Three stills for a widget (or just the starting one when nothing can be varied safely). */
export function widgetStates(widget: string, params: Record<string, unknown>): WidgetState[] {
  const start: WidgetState = {
    label: "Starting point",
    params,
    caption: "The starting settings. Look at the overall shape first.",
  };
  if (!isWidgetId(widget)) return [start];
  const schema = widgetRegistry[widget].params;
  if (!schema.safeParse(params).success) return [start];
  const ts = targets(schema, params);
  if (ts.length === 0) {
    return [
      {
        ...start,
        caption:
          "Shown at its starting settings. In Prism you can move the controls and watch it respond.",
      },
    ];
  }

  const states: WidgetState[] = [start];
  const first = ts[0];
  const current = valueOf(params, first);
  const changedValue = farEnd(current, first.bounds);
  const changed = withValue(params, first, changedValue);
  if (changedValue !== current && schema.safeParse(changed).success) {
    states.push({
      label: "One setting changed",
      params: changed,
      caption: `The ${first.label} changed from ${round(current)} to ${changedValue}. Notice what responds, and what does not.`,
    });
  }
  // Limiting case: the other end of the first range, or the extreme of a second setting.
  const second = ts[1];
  const limitTarget = second ?? first;
  const limitFrom = second ? valueOf(changed, second) : changedValue;
  const limitValue = second
    ? farEnd(limitFrom, second.bounds)
    : round(changedValue === first.bounds.max ? first.bounds.min : first.bounds.max);
  const limitParams = withValue(second ? changed : params, limitTarget, limitValue);
  if (schema.safeParse(limitParams).success && states.length === 2) {
    states.push({
      label: "Limiting case",
      params: limitParams,
      caption: second
        ? `With the ${first.label} at ${changedValue}, the ${second.label} pushed to ${limitValue}. What happens at the extreme?`
        : `The ${first.label} pushed to its other extreme, ${limitValue}. What happens at the limit?`,
    });
  }
  return states;
}

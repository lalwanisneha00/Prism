import { describe, expect, it } from "vitest";
import { widgetStates } from "@/lib/slides/states";
import { widgetRegistry } from "@/visuals/registry";

describe("widgetStates", () => {
  it("makes three labelled, schema-valid stills for a widget with numeric settings", () => {
    const params = { q1: 2, q2: -3, distance: 0.3 };
    const states = widgetStates("coulomb-force", params);
    expect(states.map((s) => s.label)).toEqual([
      "Starting point",
      "One setting changed",
      "Limiting case",
    ]);
    for (const s of states) {
      expect(widgetRegistry["coulomb-force"].params.safeParse(s.params).success).toBe(true);
      expect(s.caption.length).toBeGreaterThan(10);
    }
    expect(states[1].params).not.toEqual(params);
  });

  it("varies the first charge when a widget has only a list of charges", () => {
    const params = {
      charges: [
        { q: 1, x: -1.5, y: 0 },
        { q: -1, x: 1.5, y: 0 },
      ],
    };
    const states = widgetStates("field-lines", params);
    expect(states.length).toBeGreaterThanOrEqual(2);
    for (const s of states) {
      expect(widgetRegistry["field-lines"].params.safeParse(s.params).success).toBe(true);
    }
  });

  it("falls back to the starting still for an unknown widget or invalid settings", () => {
    expect(widgetStates("no-such-widget", {})).toHaveLength(1);
    expect(widgetStates("coulomb-force", { q1: 999 })).toHaveLength(1);
  });
});

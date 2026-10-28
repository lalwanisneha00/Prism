import { describe, expect, it, vi } from "vitest";
import { renderSettled, suspendingDynamic } from "@/visuals/renderSettled";

vi.mock("next/dynamic", () => suspendingDynamic());
import { labSamples } from "@/app/dev/visuals/labSamples";
import { VisualSpecSchema } from "@/lib/schema";
import { WidgetView } from "@/visuals/WidgetView";
import { widgetProblem } from "@/visuals/registry";
import { labWidgets } from "@/visuals/labs/registry";

describe("lab simulation templates", () => {
  it("each has a valid gallery sample", () => {
    const shown = new Set(
      labSamples.map((s) => (s.visual.type === "widget" ? s.visual.widget : "")),
    );
    for (const id of Object.keys(labWidgets)) expect(shown.has(id), id).toBe(true);
    for (const { visual } of labSamples) {
      expect(VisualSpecSchema.safeParse(visual).success).toBe(true);
      if (visual.type === "widget") expect(widgetProblem(visual.widget, visual.params)).toBeNull();
    }
  });

  it("each draws without crashing (not a fallback card)", async () => {
    for (const { visual } of labSamples) {
      if (visual.type !== "widget") continue;
      const html = await renderSettled(
        <WidgetView widget={visual.widget} params={visual.params} caption={visual.caption} />,
      );
      expect(html, visual.widget).toContain("interactive");
      expect(html, visual.widget).not.toContain("NaN");
    }
  });

  it("the coil template has controls to move both coils, turn them and reverse coil 2", async () => {
    const two = labSamples[1].visual;
    if (two.type !== "widget") throw new Error("sample");
    const html = await renderSettled(
      <WidgetView widget={two.widget} params={two.params} caption={two.caption} />,
    );
    for (const label of ["Coil 1 position", "Coil 2 position", "Turn coil 2", "Reverse coil 2"])
      expect(html).toContain(label);
    // Touch dragging: the drawing does not scroll the page while a coil is dragged.
    expect(html).toContain("touch-none");
  });

  it("rejects values outside the template's ranges", () => {
    expect(
      widgetProblem("coil-field", {
        coils: 3,
        radiusCm: 5,
        turns: 10,
        current: 1,
        separationCm: 5,
      }),
    ).toMatch(/coils/);
    expect(
      widgetProblem("heat-exchanger", {
        flow: "counter",
        hotIn: 50,
        coldIn: 50,
        hotRate: 500,
        coldRate: 500,
        ua: 500,
      }),
    ).toMatch(/hotIn/);
  });
});

import { describe, expect, it, vi } from "vitest";
import { renderSettled, suspendingDynamic } from "@/visuals/renderSettled";

// Widgets load on demand (next/dynamic); in tests they are awaited so the real widget is checked.
vi.mock("next/dynamic", () => suspendingDynamic());
import { wave2Samples } from "@/app/dev/visuals/wave2Samples";
import { VisualSpecSchema } from "@/lib/schema";
import { WidgetView } from "@/visuals/WidgetView";
import { widgetProblem } from "@/visuals/registry";
import { wave2Widgets } from "@/visuals/wave2/registry";

describe("Wave 2 widgets", () => {
  it("each has a valid gallery sample that draws without crashing", async () => {
    const shown = new Set(
      wave2Samples.map((s) => (s.visual.type === "widget" ? s.visual.widget : "")),
    );
    for (const id of Object.keys(wave2Widgets)) expect(shown.has(id), id).toBe(true);
    for (const { visual } of wave2Samples) {
      expect(VisualSpecSchema.safeParse(visual).success).toBe(true);
      if (visual.type !== "widget") continue;
      expect(widgetProblem(visual.widget, visual.params), visual.widget).toBeNull();
      const html = await renderSettled(
        <WidgetView widget={visual.widget} params={visual.params} caption={visual.caption} />,
      );
      expect(html, visual.widget).toContain("interactive");
      expect(html, visual.widget).not.toContain("NaN");
    }
  });

  it("rejects bad parameters", () => {
    expect(widgetProblem("subnet", { ip: "999.1.1", prefix: 24 })).toMatch(/ip/);
    expect(widgetProblem("knapsack-dp", { weights: [1, 2], values: [3], capacity: 5 })).toMatch(
      /same length/,
    );
    expect(widgetProblem("http-explorer", { method: "GET", status: 418 })).toMatch(/status/);
  });
});

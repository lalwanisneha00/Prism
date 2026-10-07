import { describe, expect, it, vi } from "vitest";
import { renderSettled, suspendingDynamic } from "@/visuals/renderSettled";

// Widgets load on demand (next/dynamic); in tests they are awaited so the real widget is checked.
vi.mock("next/dynamic", () => suspendingDynamic());
import { wave1Samples } from "@/app/dev/visuals/wave1Samples";
import { VisualSpecSchema } from "@/lib/schema";
import { WidgetView } from "@/visuals/WidgetView";
import { widgetProblem } from "@/visuals/registry";
import { wave1Widgets } from "@/visuals/wave1/registry";

describe("Wave 1 widgets", () => {
  it("each has a valid gallery sample", () => {
    const shown = new Set(
      wave1Samples.map((s) => (s.visual.type === "widget" ? s.visual.widget : "")),
    );
    for (const id of Object.keys(wave1Widgets)) expect(shown.has(id), id).toBe(true);
    for (const { visual } of wave1Samples) {
      expect(VisualSpecSchema.safeParse(visual).success).toBe(true);
      if (visual.type === "widget") expect(widgetProblem(visual.widget, visual.params)).toBeNull();
    }
  });

  it("each draws without crashing (not a fallback card)", async () => {
    for (const { visual } of wave1Samples) {
      if (visual.type !== "widget") continue;
      const html = await renderSettled(
        <WidgetView widget={visual.widget} params={visual.params} caption={visual.caption} />,
      );
      expect(html, visual.widget).toContain("interactive");
      expect(html, visual.widget).not.toContain("NaN");
    }
  });

  it("rejects parameters outside their ranges", () => {
    expect(widgetProblem("quantum-box", { level: 9, widthNm: 1 })).toMatch(/level/);
    expect(widgetProblem("logic-gates", { gate: "MAYBE" })).toMatch(/gate/);
  });
});

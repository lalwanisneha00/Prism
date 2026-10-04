import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { wave1Samples } from "@/app/dev/visuals/wave1Samples";
import { VisualSpecSchema } from "@/lib/schema";
import { findSubject } from "@/lib/subjects";
import { WidgetView } from "@/visuals/WidgetView";
import { widgetProblem, widgetsForTopic } from "@/visuals/registry";
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

  it("each draws without crashing (not a fallback card)", () => {
    for (const { visual } of wave1Samples) {
      if (visual.type !== "widget") continue;
      const html = renderToStaticMarkup(
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

  it("gives each Wave 1 subject at least three of its own widgets", () => {
    for (const id of [
      "applied-physics",
      "engg-chemistry",
      "basic-electrical",
      "basic-electronics",
      "engg-mechanics",
      "engg-graphics",
      "pps",
      "environmental-science",
    ]) {
      const topics = new Set(findSubject(id)!.chapters.flatMap((c) => c.topics.map((t) => t.id)));
      const own = Object.values(wave1Widgets).filter((w) =>
        (w.topics as readonly string[]).some((t) => topics.has(t)),
      );
      expect(own.length, id).toBeGreaterThanOrEqual(3);
      const covered = [...topics].filter((t) => widgetsForTopic(t).length > 0);
      expect(covered.length / topics.size, id).toBeGreaterThan(0.12);
    }
  });
});

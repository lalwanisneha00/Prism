import { describe, expect, it, vi } from "vitest";
import { renderSettled, suspendingDynamic } from "@/visuals/renderSettled";

// Widgets load on demand (next/dynamic); in tests they are awaited so the real widget is checked.
vi.mock("next/dynamic", () => suspendingDynamic());
import { wave2Samples } from "@/app/dev/visuals/wave2Samples";
import { VisualSpecSchema } from "@/lib/schema";
import { findSubject } from "@/lib/subjects";
import { WidgetView } from "@/visuals/WidgetView";
import { widgetProblem, widgetsForTopic } from "@/visuals/registry";
import { wave2Widgets } from "@/visuals/wave2/registry";

const WAVE2 = [
  "dsa",
  "discrete-maths",
  "coa",
  "operating-systems",
  "dbms",
  "computer-networks",
  "theory-of-computation",
  "oop",
  "compiler-design",
  "software-engineering",
  "web-technologies",
  "ai-ml",
  "digital-logic",
  "signals-systems",
  "network-theory",
  "analog-electronics",
  "communication-systems",
  "dsp",
  "microprocessors",
  "em-theory",
  "vlsi",
];

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

  it("gives every Wave 2 subject at least three widgets of its own", () => {
    for (const id of WAVE2) {
      const topics = new Set(findSubject(id)!.chapters.flatMap((c) => c.topics.map((t) => t.id)));
      const own = Object.values(wave2Widgets).filter((wd) =>
        (wd.topics as readonly string[]).some((t) => topics.has(t)),
      );
      expect(own.length, id).toBeGreaterThanOrEqual(3);
      const covered = [...topics].filter((t) => widgetsForTopic(t).length > 0);
      expect(covered.length / topics.size, id).toBeGreaterThan(0.15);
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

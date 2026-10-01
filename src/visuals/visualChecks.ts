import { findPhetSim, phetSims, phetSimsForTopic } from "@/data/phet";
import type { Lesson, VisualSpec } from "@/lib/schema";
import { isValidExpression } from "@/visuals/expression";
import { widgetProblem, widgetRegistry, widgetsForTopic, type WidgetId } from "@/visuals/registry";

const mermaidStart = /^\s*(flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/;

/** Why a visual can't be shown, or null if it is safe and drawable. */
export function visualProblem(visual: VisualSpec): string | null {
  switch (visual.type) {
    case "widget":
      return widgetProblem(visual.widget, visual.params);
    case "phet":
      return findPhetSim(visual.sim) ? null : `unknown PhET simulation "${visual.sim}"`;
    case "plot":
      if (!isValidExpression(visual.expression))
        return `plot expression "${visual.expression}" is not valid`;
      if (!(visual.xRange[0] < visual.xRange[1]))
        return "plot xRange must be [min, max] with min < max";
      return null;
    case "mermaid":
      if (!mermaidStart.test(visual.code))
        return 'mermaid code must start with "flowchart TD" (or LR)';
      if (/\bclick\b|<script|javascript:/i.test(visual.code))
        return "mermaid code may not contain click handlers or scripts";
      return null;
    case "image":
      return null; // Checked in the browser: a missing Commons file is simply hidden.
  }
}

/** "sections.N.visual: problem" lines, in the same style as schema problems. */
export function findVisualProblems(lesson: Lesson): string[] {
  return lesson.sections.flatMap((s, i) => {
    const problem = s.visual ? visualProblem(s.visual) : null;
    return problem ? [`sections.${i}.visual: ${problem}`] : [];
  });
}

/** Removes visuals that can't be shown (used when the AI couldn't fix them in time). */
export function dropBadVisuals(lesson: Lesson): Lesson {
  return {
    ...lesson,
    sections: lesson.sections.map((s) => {
      if (s.visual && visualProblem(s.visual)) {
        const copy = { ...s };
        delete copy.visual;
        return copy;
      }
      return s;
    }),
  };
}

/** The VISUALS part of the lesson prompt: exactly what the AI is allowed to choose from. */
export function visualPromptRules(topicId: string): string {
  const fitting = widgetsForTopic(topicId);
  const widgetLines = (Object.keys(widgetRegistry) as WidgetId[])
    .sort((a, b) => Number(fitting.includes(b)) - Number(fitting.includes(a)))
    .map(
      (id) =>
        `  - "${id}"${fitting.includes(id) ? " (fits this topic)" : ""}: ${widgetRegistry[id].name}. params: ${widgetRegistry[id].help}`,
    )
    .join("\n");
  const topicSims = phetSimsForTopic(topicId);
  const sims = (topicSims.length ? topicSims : phetSims)
    .map((s) => `"${s.id}" (${s.title})`)
    .join(", ");

  return `VISUALS (optional, at most one per section; aim for 2-4 across the lesson, choosing what genuinely helps):
Priority order: an interactive widget, then a PhET simulation, then a plot or diagram.
- {"type":"widget","widget":"<id>","params":{...},"caption":"..."} using ONLY these widgets and parameter ranges:
${widgetLines}
- {"type":"phet","sim":"<id>","caption":"..."} using ONLY: ${sims}
- {"type":"plot","expression":"<function of x using + - * / ^ ( ) and sin cos tan exp ln log sqrt abs pi>","xRange":[min,max],"xLabel":"...","yLabel":"...","caption":"..."} for how one quantity depends on another.
- {"type":"mermaid","code":"flowchart TD\\n  A[Short label] --> B[Short label]","caption":"..."} for processes or concept maps ONLY. Plain words in labels, no quotes or brackets inside labels.
Never output SVG, HTML, image URLs or anything not listed here.`;
}

import { findPhetSim, phetSimsForTopic } from "@/data/phet";
import type { Lesson, VisualSpec } from "@/lib/schema";
import { katexError, mathErrorsInMarkdown } from "@/lib/checks/mathCheck";
import { isValidExpression } from "@/visuals/expression";
import { widgetProblem, widgetRegistry, widgetsForTopic, type WidgetId } from "@/visuals/registry";

const mermaidStart = /^\s*(flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/;

/**
 * Why a visual can't be shown, or null if it is safe and drawable. With a topic, the
 * topic-specific visuals (widgets and PhET) must also be listed for that topic (SPEC §6.1 rule 4).
 */
export function visualProblem(visual: VisualSpec, topicId?: string): string | null {
  switch (visual.type) {
    case "widget": {
      const problem = widgetProblem(visual.widget, visual.params);
      if (problem || !topicId) return problem;
      return widgetsForTopic(topicId).includes(visual.widget as WidgetId)
        ? null
        : `widget "${visual.widget}" is not valid for this topic; use a plot, derivation or diagram instead`;
    }
    case "phet": {
      const sim = findPhetSim(visual.sim);
      if (!sim) return `unknown PhET simulation "${visual.sim}"`;
      return !topicId || sim.topics.includes(topicId)
        ? null
        : `PhET simulation "${visual.sim}" is not valid for this topic`;
    }
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
    case "derivation": {
      for (const [i, step] of visual.steps.entries()) {
        const error = katexError(step.math, true);
        if (error) return `derivation step ${i + 1} maths does not render (${error})`;
        const why = mathErrorsInMarkdown(step.why)[0];
        if (why) return `derivation step ${i + 1} explanation: ${why}`;
      }
      return null;
    }
    case "image":
      return null; // Checked in the browser: a missing Commons file is simply hidden.
  }
}

/** "sections.N.visual: problem" lines, in the same style as schema problems. */
export function findVisualProblems(lesson: Lesson): string[] {
  return lesson.sections.flatMap((s, i) => {
    const problem = s.visual ? visualProblem(s.visual, lesson.meta.topic) : null;
    return problem ? [`sections.${i}.visual: ${problem}`] : [];
  });
}

/** Removes visuals that can't be shown (used when the AI couldn't fix them in time). */
export function dropBadVisuals(lesson: Lesson): Lesson {
  return {
    ...lesson,
    sections: lesson.sections.map((s) => {
      if (s.visual && visualProblem(s.visual, lesson.meta.topic)) {
        const copy = { ...s };
        delete copy.visual;
        return copy;
      }
      return s;
    }),
  };
}

/**
 * The VISUALS part of the lesson prompt: exactly what the AI may choose from. Topic-specific
 * widgets and PhET sims are offered only for the topics they were built for (SPEC §6.1 rule 4);
 * generic visuals (plots, derivations, diagrams) are always available.
 */
export function visualPromptRules(topicId: string): string {
  const fitting = widgetsForTopic(topicId);
  const widgetLines = fitting
    .map((id) => `  - "${id}": ${widgetRegistry[id].name}. params: ${widgetRegistry[id].help}`)
    .join("\n");
  const sims = phetSimsForTopic(topicId)
    .map((s) => `"${s.id}" (${s.title})`)
    .join(", ");

  const mustUse = fitting.length
    ? `\nREQUIRED: at least one section MUST use one of the interactive widgets below (best: ${fitting
        .slice(0, 2)
        .map((id) => `"${id}"`)
        .join(" or ")}). Students learn most from what they can move.`
    : "";

  return `VISUALS (at most one per section; aim for 2-4 across the lesson, choosing what genuinely helps; skip a visual that would only decorate):
Priority order: an interactive widget, then a PhET simulation, then a plot, derivation or diagram.${mustUse}${visualMenu(widgetLines, sims)}`;
}

/** The list of visuals the AI may choose from. */
function visualMenu(widgetLines: string, sims: string): string {
  return `
${widgetLines ? `- {"type":"widget","widget":"<id>","params":{...},"caption":"..."} using ONLY these widgets (built for this topic) and parameter ranges:\n${widgetLines}\n` : ""}${sims ? `- {"type":"phet","sim":"<id>","caption":"..."} using ONLY: ${sims}\n` : ""}- {"type":"plot","expression":"<function of x using + - * / ^ ( ) and sin cos tan exp ln log sqrt abs pi>","xRange":[min,max],"xLabel":"...","yLabel":"...","caption":"..."} for how one quantity depends on another.
- {"type":"derivation","steps":[{"math":"<one line of LaTeX, no $ signs>","why":"<the reason for this step>"}],"caption":"..."} for a derivation or proof the student should follow step by step (2-12 steps).
- {"type":"mermaid","code":"flowchart TD\\n  A[Short label] --> B[Short label]","caption":"..."} for processes or concept maps ONLY. Plain words in labels, no quotes or brackets inside labels.
Never output SVG, HTML, image URLs or anything not listed here.`;
}

import { findPhetSim, phetSimsForTopic } from "@/data/phet";
import type { Lesson, VisualSpec } from "@/lib/schema";
import { katexError, mathErrorsInMarkdown } from "@/lib/checks/mathCheck";
import type { LevelSlug } from "@/data/levels";
import { plannerRules } from "@/lib/visualPlanner";
import { isValidExpression } from "@/visuals/expression";
import {
  chartProblem,
  compareProblem,
  formulaSpecProblem,
  graphProblem,
  statsProblem,
  stepsProblem,
} from "@/visuals/generic/checks";
import { widgetProblem, widgetRegistry, widgetsForTopic, type WidgetId } from "@/visuals/registry";

/** Mermaid diagram kinds we allow (SPEC §4.1 item 5); flowcharts also need a direction. */
const mermaidStart =
  /^\s*(?:(?:flowchart|graph)\s+(?:TD|TB|LR|RL|BT)\b|mindmap\b|sequenceDiagram\b|stateDiagram(?:-v2)?\b|classDiagram\b|erDiagram\b|gantt\b)/;

/**
 * Why a visual can't be shown, or null if it is safe and drawable. With a topic, the
 * topic-specific visuals (widgets and PhET) must also be listed for that topic (SPEC §6.1 rule 4).
 */
export function visualProblem(
  visual: VisualSpec,
  topicId?: string,
  sourceIds?: string[],
): string | null {
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
      return !topicId || phetSimsForTopic(topicId).some((x) => x.id === sim.id)
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
        return 'mermaid code must start with "flowchart TD"/"flowchart LR", "mindmap", "sequenceDiagram", "stateDiagram-v2", "classDiagram", "erDiagram" or "gantt"';
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
    case "chart":
      return chartProblem(visual, { sourceIds });
    case "graph":
      return graphProblem(visual);
    case "formula":
      return formulaSpecProblem(visual);
    case "compare":
      return compareProblem(visual);
    case "steps":
      return stepsProblem(visual);
    case "stats":
      return statsProblem(visual, { sourceIds });
    case "image":
      return null; // Checked in the browser: a missing Commons file is simply hidden.
  }
}

/** "sections.N.visual: problem" lines, in the same style as schema problems. */
export function findVisualProblems(lesson: Lesson): string[] {
  return lesson.sections.flatMap((s, i) => {
    const sourceIds = lesson.meta.sources.map((src) => src.id);
    const problem = s.visual ? visualProblem(s.visual, lesson.meta.topic, sourceIds) : null;
    return problem ? [`sections.${i}.visual: ${problem}`] : [];
  });
}

/** Removes visuals that can't be shown (used when the AI couldn't fix them in time). */
export function dropBadVisuals(lesson: Lesson): Lesson {
  return {
    ...lesson,
    sections: lesson.sections.map((s) => {
      const sourceIds = lesson.meta.sources.map((src) => src.id);
      if (s.visual && visualProblem(s.visual, lesson.meta.topic, sourceIds)) {
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
export function visualPromptRules(
  topicId: string,
  context?: { field: string; level: LevelSlug },
): string {
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
Priority order: an interactive widget, then a PhET simulation, then a generic visual (graph, formula explorer, step-through, chart, comparison, diagram).${mustUse}${context ? `\n${plannerRules(context.field, context.level)}` : ""}${visualMenu(widgetLines, sims)}`;
}

/** The list of visuals the AI may choose from. */
function visualMenu(widgetLines: string, sims: string): string {
  return `
${widgetLines ? `- {"type":"widget","widget":"<id>","params":{...},"caption":"..."} using ONLY these widgets (built for this topic) and parameter ranges:\n${widgetLines}\n` : ""}${sims ? `- {"type":"phet","sim":"<id>","caption":"..."} using ONLY: ${sims}\n` : ""}- {"type":"plot","expression":"<function of x using + - * / ^ ( ) and sin cos tan exp ln log sqrt abs pi>","xRange":[min,max],"xLabel":"...","yLabel":"...","caption":"..."} for how one quantity depends on another.
- {"type":"graph","functions":[{"expression":"<function of x>","label":"y = ..."}],"xRange":[a,b],"xLabel":"...","yLabel":"...","shade":{"index":0,"from":a,"to":b},"tangent":{"index":0,"x":x0},"points":[{"at":[x,y],"label":"..."}],"vectors":[{"from":[0,0],"to":[x,y],"label":"..."}],"equalAspect":false,"caption":"..."} for curves, areas under curves, tangents, points and vectors (shade/tangent/points/vectors optional; up to 4 functions).
- {"type":"formula","formula":"<calculation in the variables, e.g. P*(1+r/100)^t>","output":{"label":"...","unit":"..."},"variables":[{"name":"P","label":"...","unit":"...","min":0,"max":100,"value":50}],"graphVariable":"t","caption":"..."} THE FORMULA EXPLORER: sliders for AT MOST 5 variables (fix the rest as numbers in the formula), live result and graph. Variable names: a letter then letters, digits or _ (e.g. a, c_0); use + - * / ^ ( ) sqrt exp ln log sin cos tan abs pi.
- {"type":"steps","steps":[{"title":"...","body":"markdown","formula":"optional LaTeX, no $ signs"}],"caption":"..."} for a process or method shown one step at a time (2-10 steps).
- {"type":"chart","chart":"line|area|bar|stacked-bar|pie|donut|scatter|histogram|box|radar","xLabel":"with unit","yLabel":"with unit","categories":["..."],"series":[{"name":"...","values":[...]}],"scatter":[{"name":"...","points":[{"x":0,"y":0}]}],"bins":[{"from":0,"to":10,"count":3}],"boxes":[{"name":"...","min":0,"q1":0,"median":0,"q3":0,"max":0}],"unit":"% for a pie in percent","data":"computed|sourced|illustrative","sourceId":"only for sourced","caption":"..."} use only the fields the chart kind needs. DATA RULE: "sourced" numbers must come from a SOURCES excerpt and cite its id; made-up teaching numbers must be "illustrative"; never state real prices, statistics or dates without a source.
- {"type":"stats","tool":"normal|sampling|regression","mean":0,"sd":1,"shadeFrom":-1,"shadeTo":1,"population":"uniform|skewed|normal","sampleSize":5,"points":[{"x":0,"y":0}],"xLabel":"...","yLabel":"...","data":"illustrative","caption":"..."} statistics explorers (normal curve / central limit theorem / draggable regression).
- {"type":"compare","style":"table|venn|pros-cons|before-after","columns":["","A","B"],"rows":[{"label":"...","cells":["...","..."]}],"sets":[{"label":"...","items":["..."]}],"shared":["..."],"left":["..."],"right":["..."],"caption":"..."} side-by-side comparisons.
- {"type":"derivation","steps":[{"math":"<one line of LaTeX, no $ signs>","why":"<the reason for this step>"}],"caption":"..."} for a derivation or proof the student should follow step by step (2-12 steps).
- {"type":"mermaid","code":"flowchart TD\\n  A[Short label] --> B[Short label]","caption":"..."} for structure: flowchart TD/LR, mindmap, sequenceDiagram, stateDiagram-v2, classDiagram, erDiagram or gantt. Plain words in labels, no quotes or brackets inside labels.
Never output SVG, HTML, image URLs or anything not listed here.`;
}

import type { Lesson, Section } from "@/lib/schema";
import {
  pagesFor,
  planProblems,
  type Purpose,
  type Slide,
  type SlidePlan,
  type VisualRequest,
} from "@/lib/slides/plan";
import { widgetStates } from "@/lib/slides/states";
import { clip, displayFormulas, keyPoints, plainText, sentences } from "@/lib/slides/text";

/*
 * Lessons → a slide plan (Feature B). No AI is involved: every slide is made from a lesson that
 * already passed grounding, the fact-check and the code checks, so a deck says exactly what the
 * lesson says, in shorter pieces, with the full explanation in the speaker notes.
 */

export type BuildOptions = {
  purpose: Purpose;
  /** The slide count the student asked for; the result may be up to 6 slides either way. */
  targetSlides: number;
  subjectName: string;
  levelName: string;
  /** Name for the whole deck ("Gauss's law", or "Electrostatics" for a chapter). */
  title: string;
};

/** How far from the asked-for length a deck may stray when that teaches better. */
export const LENGTH_SLACK = 6;

/** A candidate slide and how essential it is (lower = keep first). */
type Candidate = { slide: Slide; priority: number; required?: boolean };

class Builder {
  visuals: Record<string, VisualRequest> = {};
  credits = new Set<string>();
  private n = 0;
  private v = 0;

  id() {
    return `s${++this.n}`;
  }

  visual(request: VisualRequest): string {
    const key = `v${++this.v}`;
    this.visuals[key] = request;
    return key;
  }

  latex(latex: string): string {
    return this.visual({ kind: "latex", latex });
  }
}

const sectionPoints = (s: Section, n: number, max = 120) => keyPoints(plainText(s.body), n, max);

/** The part of a section's text not already on the slide: what a teacher would say. */
function spoken(s: Section, skip: number, sentencesToKeep = 6): string {
  return sentences(plainText(s.body))
    .slice(skip, skip + sentencesToKeep)
    .join(" ");
}

function conceptMapCode(lesson: Lesson): string | null {
  const clean = (t: string) =>
    clip(
      plainText(t)
        .replace(/["[\]{}()<>|#;]/g, " ")
        .trim(),
      34,
    );
  const prereqs = lesson.prerequisites.slice(0, 6);
  if (prereqs.length === 0) return null;
  const lines = ["flowchart LR", `  T["${clean(lesson.meta.title)}"]`];
  prereqs.forEach((p, i) => {
    lines.push(`  P${i}["${clean(p.concept)}"] --> T`);
  });
  return lines.join("\n");
}

function visualSlides(b: Builder, s: Section, side: "left" | "right", study: boolean): Candidate[] {
  const v = s.visual;
  if (!v) return [];
  const caption = clip(plainText(v.caption), 200);
  const slide = (
    key: string,
    title: string,
    caption: string,
    layout: "left" | "right" | "full",
    notes: string,
    points: string[] = [],
  ): Slide => ({
    id: b.id(),
    layout: "image",
    title: clip(title, 90),
    picture: { key, caption, alt: caption },
    side: layout,
    points,
    notes,
  });
  switch (v.type) {
    case "widget": {
      const states = widgetStates(v.widget, v.params);
      return states.map((st, i) => {
        const key = b.visual({
          kind: "visual",
          spec: { ...v, params: st.params, caption: st.caption },
        });
        return {
          slide: slide(
            key,
            `${s.title}: ${st.label.toLowerCase()}`,
            st.caption,
            "full",
            `${st.caption} ${i === 0 ? caption : ""}`.trim(),
          ),
          priority: i === 0 ? 2 : 4,
        };
      });
    }
    case "phet":
      return [
        {
          slide: {
            id: b.id(),
            layout: "statement",
            label: "Interactive simulation",
            text: clip(`Try it in Prism: ${caption || s.title}`, 190),
            notes: `A PhET simulation (University of Colorado Boulder, CC BY) goes with this part. Open the lesson in Prism to use it. ${caption}`,
          },
          priority: 5,
        },
      ];
    case "compare":
      if (v.style === "table" && v.columns && v.rows && v.rows.length > 0) {
        return [
          {
            slide: {
              id: b.id(),
              layout: "comparison",
              title: clip(v.title ?? s.title, 90),
              columns: v.columns.slice(0, 4).map((c) => clip(plainText(c) || "—", 40)),
              rows: v.rows
                .slice(0, 6)
                .map((r) =>
                  [r.label, ...r.cells].slice(0, 4).map((c) => clip(plainText(c) || "—", 70)),
                ),
              notes: caption,
            },
            priority: 3,
          },
        ];
      }
      break;
    case "steps":
      return [
        {
          slide: {
            id: b.id(),
            layout: "steps",
            title: clip(s.title, 90),
            steps: v.steps.slice(0, 6).map((st) => clip(`${st.title}: ${plainText(st.body)}`, 150)),
            notes: caption,
          },
          priority: 3,
        },
      ];
    case "derivation":
      return [
        {
          slide: {
            id: b.id(),
            layout: "steps",
            title: clip(`${s.title}: step by step`, 90),
            steps: v.steps
              .slice(0, 6)
              .map((st) => clip(plainText(`$${st.math}$ — ${st.why}`), 150)),
            notes: caption,
          },
          priority: study ? 2 : 4,
        },
      ];
    case "image":
      b.credits.add(
        `Image: ${v.file.replace(/^File:/, "")} (Wikimedia Commons); see the picture's own licence line.`,
      );
      break;
    default:
      break;
  }
  // Charts, graphs, plots, diagrams, images, stats and the rest: the lesson's own renderer draws it.
  const key = b.visual({ kind: "visual", spec: v });
  return [
    {
      slide: slide(
        key,
        s.title,
        caption,
        v.type === "mermaid" || v.type === "chart" || v.type === "graph" ? "full" : side,
        caption || s.title,
        sectionPoints(s, 2, 90),
      ),
      priority: 2,
    },
  ];
}

function quizSlide(b: Builder, l: Lesson, i: number, showAnswer: boolean, notes: string): Slide {
  const q = l.quiz[i];
  return {
    id: b.id(),
    layout: "quiz",
    title: clip(`Quick question ${i + 1}`, 90),
    question: clip(plainText(q.question), 260),
    options: (q.options ?? []).slice(0, 6).map((o) => clip(plainText(o), 110)),
    answer: clip(plainText(q.answer), 220),
    explanation: clip(plainText(q.explanation), 300),
    showAnswer,
    notes,
  };
}

function lessonCandidates(b: Builder, l: Lesson, opts: BuildOptions, many: boolean): Candidate[] {
  const out: Candidate[] = [];
  const study = opts.purpose === "study";
  const teach = opts.purpose === "teach";
  const revise = opts.purpose === "revise";
  const push = (slide: Slide, priority: number, required = false) =>
    out.push({ slide, priority, required });
  for (const s of l.meta.sources) {
    b.credits.add(`${s.title}, ${s.publisher}${s.license ? ` (${s.license})` : ""}`);
  }

  if (many) {
    push(
      {
        id: b.id(),
        layout: "section",
        title: clip(l.meta.title, 90),
        kicker: l.meta.sources.length ? "Next topic" : "",
        notes: teach
          ? `Introduce the next topic: ${l.meta.title}. ${clip(plainText(l.hook), 300)}`
          : "",
      },
      2,
    );
  }

  if (teach || study) {
    push(
      {
        id: b.id(),
        layout: "statement",
        label: "Why it matters",
        text: clip(plainText(l.hook), 190),
        notes: `Open with this and pause. ${plainText(l.hook)} Ask: what do you already know about ${l.meta.title}? (about 1 minute)`,
      },
      1,
      true,
    );
    if (l.prerequisites.length > 0) {
      push(
        {
          id: b.id(),
          layout: "bullets",
          title: "Before we start",
          points: l.prerequisites
            .slice(0, 5)
            .map((p) => clip(`${plainText(p.concept)}: ${plainText(p.oneLiner)}`, 150)),
          notes:
            "Check these are familiar before moving on. If not, spend two minutes on whichever one is missing.",
        },
        3,
      );
    }
  }

  l.sections.forEach((s, i) => {
    const side = i % 2 === 0 ? "right" : "left";
    const formulas = displayFormulas(s.body);
    if (revise) return;
    const points = sectionPoints(s, study ? 5 : 3, study ? 150 : 110);
    if (points.length > 0) {
      const oneIdea = points.length === 1 || sentences(plainText(s.body)).length <= 2;
      if (oneIdea && !study) {
        push(
          {
            id: b.id(),
            layout: "statement",
            label: clip(s.title, 50),
            text: clip(points[0] ?? plainText(s.body), 190),
            notes:
              `${spoken(s, 0)} ${teach ? "Ask the class: can someone put this in their own words?" : ""}`.trim(),
          },
          2,
        );
      } else {
        push(
          {
            id: b.id(),
            layout: "bullets",
            title: clip(s.title, 90),
            points,
            notes:
              `${spoken(s, study ? 0 : points.length, 7)}${teach ? " Ask: which of these would you expect to change if the setup changed?" : ""}`.trim(),
          },
          i === 0 ? 1 : 2,
          i === 0,
        );
      }
    }
    if (formulas.length > 0) {
      const shown = formulas.slice(0, study ? 3 : 2);
      push(
        {
          id: b.id(),
          layout: "formula",
          title: clip(`${s.title}: the key formula${shown.length > 1 ? "s" : ""}`, 90),
          formulas: shown.map((f) => ({
            key: b.latex(f),
            caption: "",
            alt: clip(plainText(`$${f}$`), 200),
          })),
          notes: `Write the formula up and name every symbol: ${shown.map((f) => plainText(`$${f}$`)).join("; ")}.`,
        },
        2,
      );
    }
    out.push(...visualSlides(b, s, side, study));
  });

  if (l.analogies.length > 0 && !revise) {
    l.analogies.slice(0, study ? 3 : 1).forEach((a, i) => {
      push(
        {
          id: b.id(),
          layout: "two-column",
          title: clip(`An analogy: ${plainText(a.concept)}`, 90),
          left: { heading: "The analogy", points: keyPoints(plainText(a.analogy), 3, 130) },
          right: {
            heading: "Where it breaks",
            points: keyPoints(plainText(a.whereItBreaks), 3, 130),
          },
          notes: `${plainText(a.analogy)} Be honest about the limit: ${plainText(a.whereItBreaks)}`,
        },
        i === 0 ? 3 : 5,
      );
    });
  }

  if (!revise) {
    l.workedExamples.slice(0, study ? 4 : 2).forEach((ex, i) => {
      push(
        {
          id: b.id(),
          layout: "example",
          title: clip(`Worked example${l.workedExamples.length > 1 ? ` ${i + 1}` : ""}`, 90),
          problem: clip(plainText(ex.problem), 260),
          steps: ex.steps.slice(0, 6).map((st) => clip(plainText(st), 170)),
          answer: clip(plainText(ex.answer), 160),
          notes:
            `Read the problem, then let students try the first step before you show it. ${teach ? "Allow about 4 minutes." : ""}`.trim(),
        },
        i === 0 ? 2 : 4,
      );
    });
  }

  if (l.misconceptions.length > 0 && !revise) {
    push(
      {
        id: b.id(),
        layout: "comparison",
        title: "Common mistakes",
        columns: ["The mistake", "The fix"],
        rows: l.misconceptions
          .slice(0, 4)
          .map((m) => [clip(plainText(m.wrong), 70), clip(plainText(m.right), 70)]),
        notes: l.misconceptions
          .slice(0, 4)
          .map((m) => `${plainText(m.wrong)} Why it is wrong: ${plainText(m.why)}`)
          .join(" "),
      },
      3,
    );
  }

  if (revise) {
    const pts = l.revisionSheet.keyPoints;
    for (let i = 0; i < pts.length; i += 5) {
      push(
        {
          id: b.id(),
          layout: "bullets",
          title: i === 0 ? `Key points: ${clip(l.meta.title, 60)}` : "Key points (continued)",
          points: pts.slice(i, i + 5).map((p) => clip(plainText(p), 140)),
          notes: "",
        },
        i === 0 ? 1 : 2,
        i === 0,
      );
    }
  }

  const sheetFormulas = l.revisionSheet.formulas;
  if ((study || revise) && sheetFormulas.length > 0) {
    for (let i = 0; i < sheetFormulas.length; i += 3) {
      const group = sheetFormulas.slice(i, i + 3);
      push(
        {
          id: b.id(),
          layout: "formula",
          title: i === 0 ? "Formulas to remember" : "Formulas (continued)",
          formulas: group.map((f) => ({
            key: b.latex(f),
            caption: "",
            alt: clip(plainText(`$${f}$`), 200),
          })),
          notes: "",
        },
        revise ? 1 : 3,
        revise && i === 0,
      );
    }
  }

  if ((study || revise) && opts.purpose !== "teach") {
    const map = conceptMapCode(l);
    if (map) {
      const key = b.visual({ kind: "mermaid", code: map });
      push(
        {
          id: b.id(),
          layout: "image",
          title: "Concept map: what this builds on",
          picture: {
            key,
            caption: "Each arrow points from something you need first to this topic.",
            alt: `Concept map: ${l.prerequisites.map((p) => p.concept).join(", ")} lead to ${l.meta.title}`,
          },
          side: "full",
          points: [],
          notes: "",
        },
        2,
      );
    }
  }

  const mnemonics = l.revisionSheet.mnemonics ?? [];
  if ((study || revise) && mnemonics.length > 0) {
    push(
      {
        id: b.id(),
        layout: "statement",
        label: "Memory aid",
        text: clip(plainText(mnemonics[0]), 190),
        notes: "",
      },
      revise ? 2 : 4,
    );
  }

  if (teach) {
    push(
      {
        id: b.id(),
        layout: "activity",
        title: "Discuss with a partner",
        prompt: clip(plainText(l.quiz[0].question), 260),
        minutes: 3,
        notes: `Give pairs three minutes. Walk around; do not give the answer yet. The answer is: ${plainText(l.quiz[0].answer)}. ${plainText(l.quiz[0].explanation)}`,
      },
      3,
      // A teaching deck always has something for the class to do.
      true,
    );
  }

  const quizCount = revise
    ? Math.min(l.quiz.length, 6)
    : study
      ? l.quiz.length
      : Math.min(l.quiz.length, 3);
  if (opts.purpose !== "practice") {
    for (let i = teach ? 1 : 0; i < quizCount; i++) {
      push(
        quizSlide(
          b,
          l,
          i,
          !teach,
          teach
            ? `Let students answer first. Answer: ${plainText(l.quiz[i].answer)}. ${plainText(l.quiz[i].explanation)}`
            : "",
        ),
        revise ? 2 : 4,
      );
    }
  }

  if (teach || study) {
    push(
      {
        id: b.id(),
        layout: "recap",
        title: many ? `Recap: ${clip(l.meta.title, 70)}` : "Recap",
        points: l.revisionSheet.keyPoints.slice(0, 5).map((p) => clip(plainText(p), 150)),
        notes: "Ask students to say the three most important things before you show these.",
      },
      1,
      true,
    );
  }
  return out;
}

/** Keeps slide order but drops the least essential slides until the deck is the right length. */
export function fitLength(candidates: Candidate[], target: number): Candidate[] {
  const max = Math.min(target + 2, target + LENGTH_SLACK);
  if (candidates.length <= max) return candidates;
  const keep = new Set(candidates.map((_, i) => i));
  const order = candidates
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !c.required)
    .sort((a, z) => z.c.priority - a.c.priority || z.i - a.i);
  for (const { i } of order) {
    if (keep.size <= target) break;
    keep.delete(i);
  }
  return candidates.filter((_, i) => keep.has(i));
}

function practiceSlides(b: Builder, lessons: Lesson[], opts: BuildOptions): Candidate[] {
  const all = lessons.flatMap((l) => l.quiz.map((q) => ({ l, q })));
  const out: Candidate[] = [];
  const text = (q: Lesson["quiz"][number]) =>
    clip(
      plainText(q.question) +
        (q.options?.length
          ? "  " +
            q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${plainText(o)}`).join("   ")
          : ""),
      260,
    );
  out.push({
    slide: {
      id: b.id(),
      layout: "bullets",
      title: "How to use this sheet",
      points: [
        "Try every question before looking at the answers at the end.",
        "Write your working, not only the answer.",
        "Mark what you got wrong and revisit that topic.",
      ],
      notes: "",
    },
    priority: 1,
    required: true,
  });
  for (let i = 0; i < all.length; i += 4) {
    out.push({
      slide: {
        id: b.id(),
        layout: "questions",
        title: i === 0 ? "Questions" : "Questions (continued)",
        items: all.slice(i, i + 4).map(({ q }, k) => ({ n: i + k + 1, text: text(q) })),
        notes: "",
      },
      priority: 2,
    });
  }
  out.push({
    slide: { id: b.id(), layout: "section", title: "Answers", kicker: opts.title, notes: "" },
    priority: 1,
    required: true,
  });
  for (let i = 0; i < all.length; i += 4) {
    out.push({
      slide: {
        id: b.id(),
        layout: "answers",
        title: i === 0 ? "Answers" : "Answers (continued)",
        items: all.slice(i, i + 4).map(({ q }, k) => ({
          n: i + k + 1,
          answer: clip(plainText(q.answer), 220),
          why: clip(plainText(q.explanation), 300),
        })),
        notes: "",
      },
      priority: 2,
    });
  }
  return out;
}

export function buildPlan(lessons: Lesson[], opts: BuildOptions): SlidePlan {
  if (lessons.length === 0) throw new Error("buildPlan needs at least one lesson.");
  const b = new Builder();
  const many = lessons.length > 1;
  const candidates: Candidate[] = [];
  const topicNames = lessons.map((l) => l.meta.title);
  // Every deck credits the sources of the lessons it is made from.
  for (const l of lessons) {
    for (const s of l.meta.sources) {
      b.credits.add(`${s.title}, ${s.publisher}${s.license ? ` (${s.license})` : ""}`);
    }
  }

  if (opts.purpose === "summary") {
    const points = lessons.flatMap((l) => l.revisionSheet.keyPoints).slice(0, 5);
    const formulas = lessons.flatMap((l) => l.revisionSheet.formulas).slice(0, 3);
    const mnemonic = lessons.flatMap((l) => l.revisionSheet.mnemonics ?? [])[0] ?? "";
    for (const l of lessons) {
      for (const s of l.meta.sources) {
        b.credits.add(`${s.title}, ${s.publisher}${s.license ? ` (${s.license})` : ""}`);
      }
    }
    candidates.push({
      slide: {
        id: b.id(),
        layout: "summary",
        title: clip(opts.title, 100),
        points: points.map((p) => clip(plainText(p), 150)),
        formulas: formulas.map((f) => ({
          key: b.latex(f),
          caption: "",
          alt: clip(plainText(`$${f}$`), 200),
        })),
        mnemonic: clip(plainText(mnemonic), 200),
        notes: "",
      },
      priority: 1,
      required: true,
    });
  } else {
    candidates.push({
      slide: {
        id: b.id(),
        layout: "title",
        title: clip(opts.title, 100),
        subtitle: clip(`${opts.subjectName} · ${opts.levelName}`, 160),
        tag:
          opts.purpose === "practice"
            ? "Practice sheet"
            : opts.purpose === "revise"
              ? "Revision"
              : opts.purpose === "study"
                ? "Study notes"
                : "Lesson",
        notes:
          opts.purpose === "teach"
            ? `Welcome the class and say what they will be able to do by the end: ${topicNames.join(", ")}.`
            : "",
      },
      priority: 1,
      required: true,
    });
    if (opts.purpose === "practice") {
      candidates.push(...practiceSlides(b, lessons, opts));
    } else {
      for (const l of lessons) candidates.push(...lessonCandidates(b, l, opts, many));
    }
    candidates.push({
      slide: {
        id: b.id(),
        layout: "sources",
        title: "Sources and credits",
        items: [...b.credits].slice(0, 10).map((c) => ({ label: clip(c, 120), detail: "" })),
        notes: "",
      },
      priority: 1,
      required: true,
    });
  }

  const target = Math.max(1, opts.targetSlides);
  const chosen = opts.purpose === "summary" ? candidates : fitLength(candidates, target);
  const slides = chosen.map((c) => c.slide);

  // Sources slide needs at least one item; credits from images may add more later.
  const sources = slides.find((s) => s.layout === "sources");
  if (sources && sources.layout === "sources" && sources.items.length === 0) {
    sources.items.push({
      label: "Prism lessons are built from the sources listed in each lesson.",
      detail: "",
    });
  }

  // Teaching decks get a rough timing on every content slide.
  const minutes = lessons.reduce((m, l) => m + l.meta.durationMin, 0);
  if (opts.purpose === "teach") {
    const content = slides.filter((s) => s.layout !== "sources");
    const each = Math.max(1, Math.round(minutes / Math.max(1, content.length)));
    for (const s of content) {
      if (s.layout === "activity") continue;
      s.notes = `${s.notes}${s.notes ? " " : ""}(About ${each} min.)`.trim();
    }
  }

  const plan: SlidePlan = {
    title: opts.title,
    subject: opts.subjectName,
    purpose: opts.purpose,
    level: opts.levelName,
    topics: topicNames,
    ...(opts.purpose === "teach" ? { minutes: Math.min(600, Math.max(1, minutes)) } : {}),
    slides,
    visuals: Object.fromEntries(
      Object.entries(b.visuals).filter(([key]) =>
        slides.some((s) => JSON.stringify(s).includes(`"${key}"`)),
      ),
    ),
    credits: [...b.credits].slice(0, 40),
  };
  // A plan that fails its own rules is a bug here, not something to hand to the renderers.
  const problems = planProblems(plan);
  if (problems.length > 0)
    throw new Error(`Slide plan is invalid: ${problems.slice(0, 3).join("; ")}`);
  return plan;
}

/** "About 12 slides (6 pages)" for the length picker. */
export function lengthLabel(slides: number, format: "pptx" | "pdf"): string {
  return format === "pdf" ? `${slides} slides ≈ ${pagesFor(slides)} pages` : `${slides} slides`;
}

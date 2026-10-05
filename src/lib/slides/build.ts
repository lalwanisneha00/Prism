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
import { clip as cut, displayFormulas, keyPoints, plainText, sentences } from "@/lib/slides/text";

/**
 * Body text limits are generous (room for whole sentences, never cut mid-thought and never ended
 * with an ellipsis); titles keep their short limit. Text that still does not fit is split over slides.
 */
const clip = (text: string, max: number) =>
  cut(text, max >= 100 ? Math.round(max * 2.2) : max === 70 ? 150 : max, max >= 100 || max === 70);

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

const sectionPoints = (s: Section, n: number, max = 120) =>
  keyPoints(plainText(s.body), n, Math.round(max * 2.2));

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

/** Splits points over several slides so none holds more than a slide can show (never cutting text). */
export function chunkPoints(points: string[], maxPoints = 4, maxChars = 640): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const p of points) {
    if (current.length > 0 && (current.length >= maxPoints || chars + p.length > maxChars)) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(p);
    chars += p.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

const RANK = { easy: 0, medium: 1, hard: 2 } as const;

/** The question that makes students think hardest: highest difficulty, then the longest wording. */
export function hardestQuestion(l: Lesson): number {
  let best = 0;
  l.quiz.forEach((q, i) => {
    const b = l.quiz[best];
    if (
      RANK[q.difficulty] > RANK[b.difficulty] ||
      (RANK[q.difficulty] === RANK[b.difficulty] && q.question.length > b.question.length)
    )
      best = i;
  });
  return best;
}

/**
 * Class tasks that ask for thinking, not recall: predict-then-explain on the lesson's hardest
 * question, and "true or false? defend it" on one of the lesson's own common mistakes. Each says
 * how to work, which part of the lesson to look back at, and how long it deserves.
 */
function activitySlides(b: Builder, l: Lesson, many: boolean): Candidate[] {
  const out: Candidate[] = [];
  const lookBack = l.sections[Math.min(l.sections.length - 1, Math.floor(l.sections.length / 2))];
  const hi = hardestQuestion(l);
  const q = l.quiz[hi];
  const options =
    q.options && q.options.length > 0
      ? `  ${q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${plainText(o)}`).join("   ")}`
      : "";
  const minutes = q.difficulty === "hard" ? 8 : q.difficulty === "medium" ? 6 : 5;
  out.push({
    slide: {
      id: b.id(),
      layout: "activity",
      title: many ? `Think, pair, share: ${l.meta.title}` : "Think, pair, share",
      prompt: clip(`${plainText(q.question)}${options}`, 120 * 5),
      hints: [
        "Alone (2 min): decide your answer and write down the reason, not only the result.",
        "With a partner: compare reasons. If you disagree, find the exact step where you split.",
        `Check yourselves against “${plainText(lookBack.title)}” before the answer is shown.`,
      ],
      minutes,
      notes: `Run it in three beats: individual thinking, pair discussion, then cold-call two pairs. Do not reveal the answer until at least one pair has defended each option. Answer: ${plainText(q.answer)}. ${plainText(q.explanation)} Common wrong turn to listen for: ${l.misconceptions[0] ? plainText(l.misconceptions[0].wrong) : "answering from a formula without checking the situation"}.`,
    },
    priority: 3,
    required: true,
  });
  const m = l.misconceptions[0];
  if (m) {
    out.push({
      slide: {
        id: b.id(),
        layout: "activity",
        title: "True or false? Defend it",
        prompt: clip(`“${plainText(m.wrong)}”`, 120 * 4),
        hints: [
          "Vote first: true or false, silently, on your own.",
          "Then convince someone who voted the other way, using a reason from the lesson.",
          "Say what situation would make the statement true, if there is one.",
        ],
        minutes: 4,
        notes: `This is a common mistake, so expect a split vote. The statement is wrong because: ${plainText(m.why)} The correct idea: ${plainText(m.right)}`,
      },
      priority: 4,
    });
  }
  return out;
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
        notes: teach ? `Introduce the next topic: ${l.meta.title}. ${plainText(l.hook)}` : "",
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
        notes: `Open with this and pause. ${plainText(l.hook)} Ask: what do you already know about ${l.meta.title}, and where have you met it outside class? Take two or three answers (about 2 minutes).`,
      },
      1,
      true,
    );
    if (l.sections.length >= 2) {
      push(
        {
          id: b.id(),
          layout: "bullets",
          title: "What we will cover",
          points: l.sections.slice(0, 5).map((s) => clip(plainText(s.title), 150)),
          notes: `Give the route before the details: ${l.sections.map((s) => plainText(s.title)).join(", then ")}. Say which part is usually hardest so students know where to concentrate.`,
        },
        3,
      );
    }
    if (l.prerequisites.length > 0) {
      const prereqs = l.prerequisites.map((p) =>
        clip(`${plainText(p.concept)}: ${plainText(p.oneLiner)}`, 150),
      );
      chunkPoints(prereqs, 4, 720).forEach((chunk, ci) =>
        push(
          {
            id: b.id(),
            layout: "bullets",
            title: ci === 0 ? "Before we start" : "Before we start (continued)",
            points: chunk,
            notes:
              "Check these are familiar before moving on, with a quick show of hands for each. If one is missing, spend two minutes on it now: everything after builds on it.",
          },
          3,
        ),
      );
    }
  }

  l.sections.forEach((s, i) => {
    const side = i % 2 === 0 ? "right" : "left";
    const formulas = displayFormulas(s.body);
    if (revise) return;
    const text = plainText(s.body);
    const sentenceCount = sentences(text).length;
    // Every sentence of the section is kept (study: all of them; teaching: the first eight, the
    // rest in the speaker notes), split over slides rather than cut.
    const all = keyPoints(text, study ? 16 : 8, 300);
    const oneIdea = sentenceCount <= 2;
    if (oneIdea && !study && all.length > 0) {
      push(
        {
          id: b.id(),
          layout: "statement",
          label: clip(s.title, 50),
          text: clip(all.join(" "), 190),
          notes:
            `${spoken(s, 0, 12)}${teach ? " Ask the class: can someone put this in their own words, and what would change if the situation were different?" : ""}`.trim(),
        },
        2,
      );
    } else {
      chunkPoints(all, 4, 640).forEach((chunk, ci) =>
        push(
          {
            id: b.id(),
            layout: "bullets",
            title: ci === 0 ? clip(s.title, 90) : clip(`${s.title} (continued)`, 90),
            points: chunk,
            notes:
              `${ci === 0 ? spoken(s, 0, 24) : "Continue the same idea: take the points one at a time and give an example for each."}${
                teach && ci === 0
                  ? " Ask: which of these would you expect to change if the setup changed, and why?"
                  : ""
              }`.trim(),
          },
          i === 0 && ci === 0 ? 1 : ci === 0 ? 2 : 3,
          i === 0 && ci === 0,
        ),
      );
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
          notes: `Write the formula up and name every symbol, with its unit: ${shown.map((f) => plainText(`$${f}$`)).join("; ")}. Then ask: what happens to the left side if one quantity on the right doubles?`,
        },
        2,
      );
    }
    out.push(...visualSlides(b, s, side, study));
  });

  if (l.analogies.length > 0 && !revise) {
    l.analogies.slice(0, study ? 4 : 2).forEach((a, i) => {
      push(
        {
          id: b.id(),
          layout: "two-column",
          title: clip(`An analogy: ${plainText(a.concept)}`, 90),
          left: { heading: "The analogy", points: keyPoints(plainText(a.analogy), 4, 260) },
          right: {
            heading: "Where it breaks",
            points: keyPoints(plainText(a.whereItBreaks), 4, 260),
          },
          notes: `${plainText(a.analogy)} Be honest about the limit: ${plainText(a.whereItBreaks)} Ask students to find one more place the analogy fails.`,
        },
        i === 0 ? 3 : 5,
      );
    });
  }

  if (!revise) {
    l.workedExamples.slice(0, study ? 6 : 3).forEach((ex, i) => {
      const title = `Worked example${l.workedExamples.length > 1 ? ` ${i + 1}` : ""}`;
      const steps = ex.steps.map((st) => clip(plainText(st), 150));
      const first = steps.slice(0, 5);
      const rest = steps.slice(5);
      push(
        {
          id: b.id(),
          layout: "example",
          title,
          problem: clip(plainText(ex.problem), 260),
          steps: first,
          answer: rest.length > 0 ? "See the next slide." : clip(plainText(ex.answer), 160),
          notes: `Read the problem, then let students try the first step before you show it${teach ? " (allow about 5 minutes for the whole example)" : ""}. Ask: which formula applies, and what is given and what is asked?`,
        },
        i === 0 ? 2 : 4,
      );
      if (rest.length > 0) {
        push(
          {
            id: b.id(),
            layout: "steps",
            title: `${title} (continued)`,
            steps: [...rest, `Answer: ${clip(plainText(ex.answer), 150)}`].slice(0, 6),
            notes:
              "Finish the example, then check the answer's units and whether its size is sensible.",
          },
          i === 0 ? 2 : 4,
        );
      }
    });
  }

  if (l.misconceptions.length > 0 && !revise) {
    for (let i = 0; i < l.misconceptions.length; i += 3) {
      const group = l.misconceptions.slice(i, i + 3);
      push(
        {
          id: b.id(),
          layout: "comparison",
          title: i === 0 ? "Common mistakes" : "Common mistakes (continued)",
          columns: ["The mistake", "The fix"],
          rows: group.map((m) => [clip(plainText(m.wrong), 70), clip(plainText(m.right), 70)]),
          notes: group
            .map((m) => `${plainText(m.wrong)} Why it is wrong: ${plainText(m.why)}`)
            .join(" "),
        },
        3,
      );
    }
  }

  const glossary = l.glossary ?? [];
  if (glossary.length > 0 && !opts.purpose.startsWith("practice")) {
    for (let i = 0; i < glossary.length; i += 5) {
      push(
        {
          id: b.id(),
          layout: "comparison",
          title: i === 0 ? "Key terms" : "Key terms (continued)",
          columns: ["Term", "Meaning"],
          rows: glossary
            .slice(i, i + 5)
            .map((g) => [clip(plainText(g.term), 40), clip(plainText(g.definition), 70)]),
          notes: "Have students say each definition in their own words before reading it out.",
        },
        revise ? 2 : 4,
      );
    }
  }

  if (revise) {
    const pts = l.revisionSheet.keyPoints.map((p) => clip(plainText(p), 150));
    chunkPoints(pts, 5, 760).forEach((chunk, ci) =>
      push(
        {
          id: b.id(),
          layout: "bullets",
          title: ci === 0 ? `Key points: ${clip(l.meta.title, 60)}` : "Key points (continued)",
          points: chunk,
          notes: "",
        },
        ci === 0 ? 1 : 2,
        ci === 0,
      ),
    );
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

  if (teach) out.push(...activitySlides(b, l, many));

  const quizCount = revise
    ? Math.min(l.quiz.length, 8)
    : study
      ? l.quiz.length
      : Math.min(l.quiz.length, 4);
  if (opts.purpose !== "practice") {
    // The question used for the class activity is not asked again.
    const used = teach ? hardestQuestion(l) : -1;
    for (let i = 0; i < quizCount; i++) {
      if (i === used) continue;
      push(
        quizSlide(
          b,
          l,
          i,
          !teach,
          teach
            ? `Give a minute to think, then take answers before revealing. Answer: ${plainText(l.quiz[i].answer)}. ${plainText(l.quiz[i].explanation)}`
            : "",
        ),
        revise ? 2 : 4,
      );
    }
  }

  if (teach || study) {
    const keyPts = l.revisionSheet.keyPoints.map((p) => clip(plainText(p), 150));
    chunkPoints(keyPts, 5, 760).forEach((chunk, ci) =>
      push(
        {
          id: b.id(),
          layout: "recap",
          title:
            (many ? `Recap: ${clip(l.meta.title, 70)}` : "Recap") + (ci > 0 ? " (continued)" : ""),
          points: chunk,
          notes:
            "Ask students to say the three most important things before you show these, then set one question to answer for next time.",
        },
        ci === 0 ? 1 : 3,
        ci === 0,
      ),
    );
  }

  const more = [...l.furtherLearning.readings, ...l.furtherLearning.videos].slice(0, 5);
  if ((teach || study) && more.length > 0) {
    push(
      {
        id: b.id(),
        layout: "bullets",
        title: "Keep learning",
        points: more.map((m) => clip(`${plainText(m.title)} (${plainText(m.publisher)})`, 150)),
        notes: `Where to go next: ${more.map((m) => `${plainText(m.title)} at ${m.url}`).join("; ")}.`,
      },
      5,
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

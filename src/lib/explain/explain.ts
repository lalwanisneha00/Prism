import { z } from "zod";
import { mathErrorsInMarkdown } from "@/lib/checks/mathCheck";
import { parseJsonReply } from "@/lib/jsonReply";
import { LlmError, type GenerateOptions } from "@/lib/llm/types";
import { levelGuides } from "@/lib/prompts/levelGuides";
import type { Lesson } from "@/lib/schema";

/*
 * Interaction tools (SPEC §8, V2 · Step 7): "Explain simpler" and "Another analogy" for a
 * section, and "Explain" / "Define" for text the student selects. Every answer is short,
 * grounded in the lesson the student is reading, and checked before it is shown.
 */

export const MAX_SELECTION = 600;

export const ExplainActionSchema = z.enum(["simpler", "analogy", "explain", "define"]);
export type ExplainAction = z.infer<typeof ExplainActionSchema>;

export const ExplainInputSchema = z
  .object({
    action: ExplainActionSchema,
    sectionId: z.string().max(80).optional(),
    selection: z.string().trim().min(1).max(MAX_SELECTION).optional(),
    /** Analogies already shown, so "Another analogy" really gives a new one. */
    avoid: z.array(z.string().max(1500)).max(5).optional(),
  })
  .refine(
    (i) => (i.action === "simpler" || i.action === "analogy" ? !!i.sectionId : !!i.selection),
    {
      message: "simpler/analogy need a sectionId; explain/define need a selection",
    },
  );
export type ExplainInput = z.infer<typeof ExplainInputSchema>;

const ReplySchema = z.object({ text: z.string().trim().min(1).max(2500) });

export type ExplainResponse =
  { ok: true; text: string } | { ok: false; kind: string; message: string };

/** The lesson text a request is about: the section, or the section containing the selection. */
export function contextFor(lesson: Lesson, input: ExplainInput): string {
  const section =
    lesson.sections.find((s) => s.id === input.sectionId) ??
    (input.selection
      ? lesson.sections.find((s) =>
          s.body.toLowerCase().includes(input.selection!.slice(0, 40).toLowerCase()),
        )
      : undefined);
  if (section) return `${section.title}\n${section.body}`;
  return `${lesson.hook}\nKEY POINTS:\n${lesson.revisionSheet.keyPoints.join("\n")}`;
}

const tasks: Record<ExplainAction, string> = {
  simpler:
    "Explain this part again, much more simply: shorter sentences, everyday words, one concrete example. Keep it correct; do not drop the key idea. 80-160 words.",
  analogy:
    "Give ONE fresh everyday analogy for the key idea of this part (not one already used), then one sentence on where the analogy breaks down. 60-130 words.",
  explain:
    "Explain the SELECTED TEXT in the context of this lesson so a student who is stuck on it understands. 60-140 words.",
  define:
    "Define the SELECTED TEXT precisely but simply, as used in this lesson: one-sentence definition, then one sentence of context or an example. 25-70 words.",
};

export function buildExplainPrompt(lesson: Lesson, input: ExplainInput) {
  const guide = levelGuides[lesson.meta.level];
  const system = `You are ${guide.persona}. You help a student who is reading a lesson.
Rules:
- Reply with JSON only: {"text": "<markdown answer>"}.
- Maths uses KaTeX: inline $...$; inside JSON strings every backslash must be doubled (\\\\frac).
- Stay consistent with the lesson content given. Standard first-year textbook facts are fine; never invent references or links.
- No headings. At most one short list.`;

  const avoid = input.avoid?.length
    ? `\nANALOGIES ALREADY SHOWN (use a different one):\n${input.avoid.map((a) => `- ${a.slice(0, 300)}`).join("\n")}`
    : "";
  const selection = input.selection ? `\nSELECTED TEXT: "${input.selection}"` : "";
  const prompt = `LESSON: ${lesson.meta.title} (level: ${lesson.meta.level})
LESSON CONTENT:
${contextFor(lesson, input).slice(0, 4000)}
${selection}${avoid}

TASK: ${tasks[input.action]}`;
  return { system, prompt };
}

/** Asks the AI, checks the answer (shape and maths), and retries once with the problems. */
export async function explain(
  lesson: Lesson,
  input: ExplainInput,
  generate: (o: GenerateOptions) => Promise<string>,
  signal?: AbortSignal,
): Promise<string> {
  const { system, prompt } = buildExplainPrompt(lesson, input);
  let request = prompt;
  let problems: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await generate({ system, prompt: request, signal, temperature: 0.6 });
    try {
      const { text } = ReplySchema.parse(parseJsonReply(reply));
      problems = mathErrorsInMarkdown(text);
      if (problems.length === 0) return text;
    } catch {
      problems = [
        'the reply must be JSON shaped like {"text": "..."} with at most 2500 characters',
      ];
    }
    request = `${prompt}\n\nYOUR PREVIOUS REPLY HAD THESE PROBLEMS, fix them:\n${problems
      .slice(0, 5)
      .map((p) => `- ${p}`)
      .join("\n")}`;
  }
  throw new LlmError("bad-response", `explain failed checks: ${problems.join("; ")}`);
}

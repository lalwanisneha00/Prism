import { z } from "zod";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { parseJsonReply } from "@/lib/jsonReply";
import { clampMarks, fakeGrades, gradePrompt, GradeReplySchema } from "@/lib/mock/grade";

/*
 * POST { items } → { ok, grades }: marks for written mock answers (mock test overhaul), against
 * each question's marking scheme, with partial marks and a line of feedback. Marks are kept
 * within each question's maximum here, whatever the AI says. Answers it skipped are left out,
 * and the browser lets the student mark those themselves.
 */

export const maxDuration = 60;

const RequestSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().max(20),
        question: z.string().trim().min(1).max(2000),
        marks: z.number().positive().max(100),
        answer: z.string().trim().min(1).max(4000),
        scheme: z
          .array(z.object({ point: z.string().trim().min(1).max(300), marks: z.number().min(0) }))
          .min(1)
          .max(10),
        studentAnswer: z.string().trim().min(1).max(5000),
      }),
    )
    .min(1)
    .max(10),
});

type Grade = { id: string; marks: number; met: number[]; feedback: string };
type Reply = { ok: true; grades: Grade[] } | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);
  const items = body.data.items;
  const byId = new Map(items.map((i) => [i.id, i]));
  try {
    let raw: unknown;
    if (process.env.LLM_PROVIDER === "fake") raw = fakeGrades(items);
    else {
      const { system, prompt } = gradePrompt(items);
      const text = await generateJsonWithFallback(chainFor(req, providersFromEnv), {
        system,
        prompt,
        temperature: 0.1,
        signal: req.signal,
      });
      raw = parseJsonReply(text);
    }
    const parsed = GradeReplySchema.safeParse(raw);
    if (!parsed.success) throw new LlmError("bad-response", "grades not valid");
    const grades = parsed.data.grades.flatMap((g): Grade[] => {
      const item = byId.get(g.id);
      if (!item) return [];
      return [
        {
          id: g.id,
          marks: clampMarks(g.marks, item.marks),
          met: [...new Set(g.met)].filter((i) => i < item.scheme.length),
          feedback: g.feedback,
        },
      ];
    });
    return reply({ ok: true, grades });
  } catch (err) {
    const error =
      err instanceof LlmError
        ? err
        : new LlmError(err instanceof SyntaxError ? "bad-response" : "unavailable", String(err));
    console.error("[api/mock-test/grade]", error.message);
    const status = error.kind === "rate-limit" ? 429 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}

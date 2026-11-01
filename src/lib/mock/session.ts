import { z } from "zod";
import { PaperSchema, type Paper } from "@/lib/mock/paper";
import type { MockAnswer } from "@/lib/mock/grade";
import { EXAM_STYLES } from "@/lib/mock/pattern";

/*
 * The mock being taken right now, saved in this browser after every answer (mock test overhaul),
 * so a refresh or a closed tab doesn't lose anything: like writing in pen instead of pencil.
 * Only one at a time. The clock keeps running while the tab is closed, as in a real exam hall.
 */

const KEY = "prism.mock.session";

const SessionSchema = z.object({
  version: z.literal(1),
  subject: z.string().max(80),
  /** Where it was started: the Mock Tests page or a chapter lesson. */
  origin: z.enum(["page", "chapter"]),
  scope: z.object({
    level: z.enum(["subject", "units", "topics"]),
    ids: z.array(z.string().max(80)).max(400),
    label: z.string().max(200),
  }),
  settings: z.object({
    marks: z.number(),
    minutes: z.number(),
    style: z.enum([...EXAM_STYLES, "default"]),
    difficulty: z.enum(["easy", "mixed", "hard"]),
    pyqRepeat: z.boolean(),
  }),
  paper: PaperSchema,
  answers: z.record(
    z.string(),
    z.object({ picked: z.string().optional(), written: z.string().optional() }),
  ),
  review: z.array(z.string()),
  current: z.string().optional(),
  startedAt: z.number(),
  endsAt: z.number(),
});

export type MockSession = z.infer<typeof SessionSchema>;

export function parseSession(raw: unknown): MockSession | null {
  return SessionSchema.safeParse(raw).data ?? null;
}

export function loadSession(): MockSession | null {
  try {
    return parseSession(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function saveSession(session: MockSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Storage full or blocked: the test still works, it just won't survive a refresh.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * The saved test for a place, if any: still running (with the minutes left) or out of time while
 * the page was closed (to be handed in). Only for browser code.
 */
export function restoreSession(
  origin: MockSession["origin"],
  matches: (s: MockSession) => boolean = () => true,
  now = Date.now(),
):
  | { state: "running"; session: MockSession; minutesLeft: number }
  | { state: "expired"; session: MockSession }
  | null {
  if (typeof window === "undefined") return null;
  const s = loadSession();
  if (!s || s.origin !== origin || !matches(s)) return null;
  const left = secondsLeft(s.endsAt, now);
  if (left > 0) return { state: "running", session: s, minutesLeft: Math.ceil(left / 60) };
  clearSession();
  return { state: "expired", session: s };
}

/** Seconds left (never below 0). */
export const secondsLeft = (endsAt: number, now: number) =>
  Math.max(0, Math.round((endsAt - now) / 1000));

/** Answers kept with the paper's questions only (a stale key can't sneak into a result). */
export function answersFor(paper: Paper, answers: Readonly<Record<string, MockAnswer>>) {
  const ids = new Set(paper.sections.flatMap((s) => s.questions.map((q) => q.id)));
  return Object.fromEntries(Object.entries(answers).filter(([id]) => ids.has(id)));
}

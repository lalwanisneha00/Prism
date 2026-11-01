"use client";

import { apiFetch } from "@/lib/byok/apiFetch";
import { mergeRevision, type TopicLesson } from "@/lib/chapter/extras";
import type { CustomSubjectPayload } from "@/lib/custom/customSubject";
import { sectionText } from "@/lib/extract/types";
import type { LessonErrorKind } from "@/lib/lessonEvents";
import { lessonsByChapter } from "@/lib/mock/deviceLessons";
import {
  breakdown,
  hasAnswer,
  mcqGrade,
  type MockAnswer,
  type QuestionGrade,
} from "@/lib/mock/grade";
import {
  paperProblems,
  PYQ_REPEAT_SHARE,
  similarity,
  type Paper,
  type PaperQuestion,
  type PaperSection,
  type PlannedSection,
} from "@/lib/mock/paper";
import type { PaperPattern } from "@/lib/mock/pattern";
import { batches, type PaperInfo } from "@/lib/mock/plan";
import { rulePattern } from "@/lib/mock/readPattern";
import type { ScopeTopic, ScopeTree } from "@/lib/mock/scope";
import { recordMockResult } from "@/lib/mock/results";
import { listLocalNotes, listRemoteOnlyNotes, setPaperPattern } from "@/lib/notes/store";
import { searchChunks, type NoteChunk } from "@/lib/notes/retrieval";
import type { MockSettings, StoredNote } from "@/lib/storage/db";
import { getSettings, updateSettings } from "@/lib/storage/progress";
import { splitPaper } from "@/lib/worksheet/splitPaper";

/*
 * The browser side of a mock (mock test overhaul): gathers what to ground the questions in
 * (lesson facts, the student's notes, past questions), asks the server for the paper a few
 * questions at a time, waits and retries when the free AI is busy, then marks the answers.
 */

export class MockError extends Error {
  constructor(
    readonly kind: LessonErrorKind,
    message: string = kind,
  ) {
    super(message);
  }
}

/** Waits before a retry when the AI is busy: a few seconds, then longer. */
const RETRY_WAITS_MS = [4_000, 12_000];

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new MockError("unavailable", "stopped"));
    });
  });

/** POSTs JSON; busy (429/503) replies are retried after a wait, telling the page about it. */
export async function postJson(
  url: string,
  body: unknown,
  opts: { signal?: AbortSignal; onWait?: (seconds: number) => void; retryBad?: boolean } = {},
): Promise<Record<string, unknown>> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await apiFetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch {
      if (opts.signal?.aborted) throw new MockError("unavailable", "stopped");
      throw new MockError(navigator.onLine ? "unavailable" : "offline");
    }
    const data: unknown = await res.json().catch(() => null);
    const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    if (obj.ok === true) return obj;
    const kind = typeof obj.kind === "string" ? obj.kind : "unavailable";
    const retryable =
      res.status === 429 || res.status === 503 || (opts.retryBad && res.status === 422);
    if (retryable && attempt < RETRY_WAITS_MS.length) {
      opts.onWait?.(RETRY_WAITS_MS[attempt] / 1000);
      await sleep(RETRY_WAITS_MS[attempt], opts.signal);
      continue;
    }
    throw new MockError(isErrorKind(kind) ? kind : "unavailable");
  }
}

const ERROR_KINDS: readonly LessonErrorKind[] = [
  "not-configured",
  "auth",
  "rate-limit",
  "unavailable",
  "blocked",
  "bad-response",
  "invalid-request",
  "offline",
];
const isErrorKind = (k: string): k is LessonErrorKind =>
  (ERROR_KINDS as readonly string[]).includes(k);

const noteText = (n: StoredNote) => (n.sections ?? []).map(sectionText).join("\n");

/** A past-paper upload's tag: untagged old "previous-year paper" uploads count as end-sem. */
const isPaper = (n: { kind?: string; paper?: unknown }) => n.kind === "pyq" || Boolean(n.paper);

/** Every past paper the student uploaded, on this device or another. */
export async function loadPapers(): Promise<PaperInfo[]> {
  const [local, remote] = await Promise.all([
    listLocalNotes().catch(() => []),
    listRemoteOnlyNotes().catch(() => []),
  ]);
  const toInfo = (
    n: { id: string; name: string; subject?: string; kind?: string; paper?: StoredNote["paper"] },
    isLocal: boolean,
  ): PaperInfo => ({
    id: n.id,
    name: n.name,
    ...(n.subject ? { subject: n.subject } : {}),
    kind: n.paper?.kind ?? "end-sem",
    ...(n.paper?.year ? { year: n.paper.year } : {}),
    ...(n.paper?.pattern ? { pattern: n.paper.pattern } : {}),
    local: isLocal,
  });
  return [
    ...local.filter(isPaper).map((n) => toInfo(n, true)),
    ...remote.filter(isPaper).map((n) => toInfo(n, false)),
  ];
}

/**
 * Reads a paper's pattern once and keeps it with the upload. The AI reads it; when the AI is
 * busy or unavailable, the free rule-based reader does. Undefined when neither finds questions.
 */
export async function analysePaper(
  noteId: string,
  onWait?: (seconds: number) => void,
): Promise<PaperPattern | undefined> {
  const note = (await listLocalNotes()).find((n) => n.id === noteId);
  if (!note) return undefined;
  if (note.paper?.pattern) return note.paper.pattern;
  const text = noteText(note).slice(0, 60_000);
  if (text.trim().length < 20) return undefined;
  let pattern: PaperPattern | undefined;
  try {
    const reply = await postJson("/api/mock-test/pattern", { text }, { onWait });
    pattern = reply.pattern as PaperPattern;
  } catch {
    pattern = rulePattern(text, Date.now());
  }
  if (pattern) await setPaperPattern(noteId, pattern);
  return pattern;
}

/** Facts from the lessons on this device, per topic, and which topics were studied. */
export async function lessonFacts(
  subjectId: string,
): Promise<{ facts: Map<string, string[]>; studied: Set<string> }> {
  const byChapter = await lessonsByChapter(subjectId).catch(() => new Map<string, TopicLesson[]>());
  const facts = new Map<string, string[]>();
  for (const list of byChapter.values())
    for (const t of list) {
      const sheet = mergeRevision([t]);
      facts.set(
        t.topicId,
        [...sheet.keyPoints, ...sheet.formulas.map((f) => `Formula: $${f}$`)]
          .map((f) => f.slice(0, 400))
          .slice(0, 8),
      );
    }
  return { facts, studied: new Set(facts.keys()) };
}

type Sources = {
  facts: Map<string, string[]>;
  chunks: NoteChunk[];
  pyqs: string[];
};

/** What the questions are grounded in: lesson facts, the student's notes, past questions. */
async function gatherSources(
  subjectId: string,
  papers: readonly PaperInfo[],
  style: MockSettings["style"],
): Promise<Sources> {
  const [{ facts }, notes] = await Promise.all([
    lessonFacts(subjectId),
    listLocalNotes().catch(() => []),
  ]);
  const mine = notes.filter((n) => !n.subject || n.subject === subjectId);
  const chunks = mine
    .filter((n) => !isPaper(n) && n.kind !== "syllabus")
    .flatMap((n) => n.chunks.map((c) => ({ ...c, noteId: n.id, noteName: n.name })));
  const styleKind = style === "default" ? undefined : style;
  const paperNotes = mine.filter(
    (n) =>
      isPaper(n) &&
      n.subject === subjectId &&
      (!styleKind || (n.paper?.kind ?? "end-sem") === styleKind),
  );
  const fromText = paperNotes.flatMap((n) => splitPaper(noteText(n)));
  const fromOther = papers
    .filter((p) => !p.local && (!styleKind || p.kind === styleKind))
    .flatMap((p) => p.pattern?.samples ?? []);
  const pyqs = [...new Set([...fromText, ...fromOther].map((q) => q.slice(0, 500)))];
  return { facts, chunks, pyqs };
}

/** Past questions closest to a batch's topics (the most useful style examples). */
function closestPyqs(pyqs: readonly string[], topicNames: string, limit = 12): string[] {
  if (pyqs.length <= limit) return [...pyqs];
  return [...pyqs]
    .map((q, i) => ({ q, i, s: similarity(q, topicNames) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.q);
}

export type GenProgress = {
  sections: { id: string; name: string; total: number; ready: number }[];
  /** Shown while waiting for a busy AI. */
  waiting?: number;
};

export type GenerateInput = {
  subjectId: string;
  subjectName: string;
  custom?: CustomSubjectPayload;
  title: string;
  plan: PlannedSection[];
  scope: readonly ScopeTopic[];
  settings: MockSettings;
  papers: readonly PaperInfo[];
  styleNote: string;
};

/**
 * Writes the paper section by section (a few questions per request), reporting progress as each
 * batch arrives. The finished paper is checked once more (scope, marks) before it is returned.
 */
export async function generatePaper(
  input: GenerateInput,
  onProgress: (p: GenProgress) => void,
  signal?: AbortSignal,
): Promise<Paper> {
  const progress: GenProgress = {
    sections: input.plan.map((s) => ({ id: s.id, name: s.name, total: s.slots.length, ready: 0 })),
  };
  const report = () =>
    onProgress({ ...progress, sections: progress.sections.map((s) => ({ ...s })) });
  report();
  const sources = await gatherSources(input.subjectId, input.papers, input.settings.style);
  const names = new Map(input.scope.map((t) => [t.id, t.name]));
  const scope = input.scope.map((t) => t.id);
  let repeatLeft = input.settings.pyqRepeat
    ? Math.floor(input.settings.marks * PYQ_REPEAT_SHARE)
    : 0;
  const written: string[] = [];
  const sections: PaperSection[] = [];

  for (const [si, section] of input.plan.entries()) {
    const questions: PaperQuestion[] = [];
    for (const batch of batches(section)) {
      const topics = [...new Set(batch.slots.map((s) => s.topic))];
      const topicNames = topics.map((t) => names.get(t) ?? t).join(", ");
      const facts = Object.fromEntries(
        topics.flatMap((t) => {
          const list = sources.facts.get(t);
          return list?.length ? [[t, list]] : [];
        }),
      );
      const material = searchChunks(sources.chunks, topicNames, 6).map((c) => c.text.slice(0, 800));
      const reply = await postJson(
        "/api/mock-test",
        {
          subject: input.subjectId,
          ...(input.custom ? { custom: input.custom } : {}),
          section: batch,
          scope,
          facts,
          material,
          pyqs: closestPyqs(sources.pyqs, topicNames),
          pyqRepeat: repeatLeft > 0,
          pyqRepeatMarks: repeatLeft,
          difficulty: input.settings.difficulty,
          styleNote: input.styleNote,
          avoid: written.slice(-40),
        },
        {
          signal,
          retryBad: true,
          onWait: (s) => {
            progress.waiting = s;
            report();
          },
        },
      );
      delete progress.waiting;
      const got = (reply.questions as PaperQuestion[]) ?? [];
      for (const q of got) {
        if (q.source === "pyq-repeat") repeatLeft -= q.marks;
        written.push(q.question.slice(0, 200));
      }
      questions.push(...got);
      progress.sections[si].ready = questions.length;
      report();
    }
    sections.push({
      id: section.id,
      name: section.name,
      ...(section.instructions ? { instructions: section.instructions } : {}),
      ...(section.attempt ? { attempt: section.attempt } : {}),
      questions,
    });
  }
  const paper: Paper = {
    title: input.title,
    subject: input.subjectId,
    totalMarks: input.settings.marks,
    minutes: input.settings.minutes,
    sections,
  };
  const problems = paperProblems(paper, new Set(scope), input.settings.marks);
  if (problems.length) {
    console.warn("[mock] paper failed the final check:", problems.join("; "));
    throw new MockError("bad-response");
  }
  return paper;
}

/** Most written answers marked in one request. */
const GRADE_BATCH = 8;

/**
 * Marks a finished paper: MCQs here, written answers by the AI. Written answers the AI couldn't
 * mark are listed in `selfMark`, for the student to mark by ticking the scheme's points.
 */
export async function gradePaper(
  paper: Paper,
  answers: Readonly<Record<string, MockAnswer>>,
  onWait?: (seconds: number) => void,
): Promise<{ grades: Record<string, QuestionGrade>; selfMark: string[] }> {
  const grades: Record<string, QuestionGrade> = {};
  const written: PaperQuestion[] = [];
  for (const q of paper.sections.flatMap((s) => s.questions)) {
    const a = answers[q.id];
    if (q.type === "mcq") grades[q.id] = mcqGrade(q, a);
    else if (!hasAnswer(a)) grades[q.id] = { marks: 0, by: "auto", feedback: "Not answered." };
    else written.push(q);
  }
  const selfMark: string[] = [];
  for (let i = 0; i < written.length; i += GRADE_BATCH) {
    const batch = written.slice(i, i + GRADE_BATCH);
    try {
      const reply = await postJson(
        "/api/mock-test/grade",
        {
          items: batch.map((q) => ({
            id: q.id,
            question: q.question,
            marks: q.marks,
            answer: q.answer,
            scheme: q.scheme,
            studentAnswer: (answers[q.id]?.written ?? "").slice(0, 5000),
          })),
        },
        { onWait },
      );
      const list =
        (reply.grades as { id: string; marks: number; met: number[]; feedback: string }[]) ?? [];
      const byId = new Map(list.map((g) => [g.id, g]));
      for (const q of batch) {
        const g = byId.get(q.id);
        if (g)
          grades[q.id] = {
            marks: g.marks,
            by: "ai",
            met: g.met,
            ...(g.feedback ? { feedback: g.feedback } : {}),
          };
        else selfMark.push(q.id);
      }
    } catch {
      selfMark.push(...batch.map((q) => q.id));
    }
  }
  return { grades, selfMark };
}

/** Saves the result (synced) so the dashboard and weak topics see it. */
export async function saveMockResult(input: {
  subjectId: string;
  title: string;
  scope: { level: "subject" | "units" | "topics"; ids: string[]; label: string };
  settings: MockSettings;
  paper: Paper;
  answers: Record<string, MockAnswer>;
  grades: Record<string, QuestionGrade>;
  tree: ScopeTree;
}): Promise<void> {
  const b = breakdown(input.paper, input.answers, input.grades, input.tree);
  const units = [...new Set(b.byTopic.map((t) => t.unitId))];
  await recordMockResult({
    subject: input.subjectId,
    chapter: units.length === 1 && units[0] ? units[0] : "multiple",
    level: "exam-prep",
    minutes: input.settings.minutes,
    title: input.title,
    score: b.score,
    total: b.total,
    byTopic: b.byTopic.slice(0, 40).map((t) => ({ topic: t.id, score: t.score, total: t.total })),
    scope: input.scope,
    settings: input.settings,
    paper: input.paper,
    answers: input.answers,
    grades: input.grades,
  });
}

export async function loadMockPrefs(subjectId: string): Promise<MockSettings | undefined> {
  return (await getSettings().catch(() => undefined))?.mockPrefs?.[subjectId];
}

export async function saveMockPrefs(subjectId: string, settings: MockSettings): Promise<void> {
  const prefs = (await getSettings().catch(() => undefined))?.mockPrefs ?? {};
  await updateSettings({ mockPrefs: { ...prefs, [subjectId]: settings } }).catch(() => undefined);
}

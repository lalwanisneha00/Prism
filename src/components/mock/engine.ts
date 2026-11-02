"use client";

import { apiFetch } from "@/lib/byok/apiFetch";
import { mergeRevision, type TopicLesson } from "@/lib/chapter/extras";
import type { CustomSubjectPayload } from "@/lib/custom/customSubject";
import { sectionText } from "@/lib/extract/types";
import type { LessonErrorKind } from "@/lib/lessonEvents";
import { lessonsByChapter } from "@/lib/mock/deviceLessons";
import { EXAMINE_LIMIT, type Verdict } from "@/lib/mock/examiner";
import {
  paperProblems,
  PREREQ_SHARE,
  PYQ_REPEAT_SHARE,
  RECALL_SHARE,
  similarity,
  type Feedback,
  type Paper,
  type PaperQuestion,
  type PaperSection,
  type PlannedSection,
} from "@/lib/mock/paper";
import type { PaperPattern } from "@/lib/mock/pattern";
import { batches, type PaperInfo } from "@/lib/mock/plan";
import { rulePattern } from "@/lib/mock/readPattern";
import type { ScopeTopic } from "@/lib/mock/scope";
import { isRecall } from "@/lib/mock/verify";
import { recordMockResult } from "@/lib/mock/results";
import { reviewPaper, ReviewFailed } from "@/lib/mock/review";
import { listLocalNotes, listRemoteOnlyNotes, setPaperPattern } from "@/lib/notes/store";
import { searchChunks, type NoteChunk } from "@/lib/notes/retrieval";
import type { MockSettings, StoredNote } from "@/lib/storage/db";
import { getSettings, updateSettings } from "@/lib/storage/progress";
import { splitPaper } from "@/lib/worksheet/splitPaper";

/*
 * The browser side of a mock (mock test overhaul): gathers what to ground the questions in
 * (lesson facts, the student's notes, past questions, an uploaded syllabus), asks the server for
 * the paper a few questions at a time, has the examiner check the whole paper and the writer fix
 * what it rejects, and waits and retries when the free AI is busy.
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
    // 502/504 (or a reply that isn't JSON) is the host cutting a slow request off: try again.
    const retryable =
      res.status === 429 ||
      res.status === 502 ||
      res.status === 503 ||
      res.status === 504 ||
      data === null ||
      (opts.retryBad && res.status === 422);
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
  /** The student's uploaded syllabus for this subject (the boundary), if any. */
  syllabus?: string;
};

/** Most syllabus text sent with each request. */
const SYLLABUS_CHARS = 4000;

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
  // Only a syllabus uploaded for this subject sets the boundary (an untagged one might be another's).
  const syllabus = mine
    .filter((n) => n.kind === "syllabus" && n.subject === subjectId)
    .map(noteText)
    .join("\n")
    .trim()
    .slice(0, SYLLABUS_CHARS);
  return { facts, chunks, pyqs, ...(syllabus ? { syllabus } : {}) };
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
  /** Writing the questions, the examiner checking them, or rewriting the ones it rejected. */
  stage?: "writing" | "checking" | "fixing";
  /** Questions being checked or rewritten in this round. */
  failing?: number;
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

/** Marks a kind of question takes among these questions. */
const marksOf = (qs: readonly PaperQuestion[], test: (q: PaperQuestion) => boolean) =>
  qs.filter(test).reduce((n, q) => n + q.marks, 0);

/**
 * Writes the paper section by section (a few questions per request), reporting progress as each
 * batch arrives. Then the whole paper goes to the examiner once; rejected questions are rewritten
 * and checked again (see review.ts). The finished paper gets a last code check (sections, marks,
 * scope, repeats) before it is returned. Nothing unchecked is ever returned.
 */
export async function generatePaper(
  input: GenerateInput,
  onProgress: (p: GenProgress) => void,
  signal?: AbortSignal,
): Promise<Paper> {
  const progress: GenProgress = {
    sections: input.plan.map((s) => ({ id: s.id, name: s.name, total: s.slots.length, ready: 0 })),
    stage: "writing",
  };
  const report = () =>
    onProgress({ ...progress, sections: progress.sections.map((s) => ({ ...s })) });
  report();
  const onWait = (s: number) => {
    progress.waiting = s;
    report();
  };
  const sources = await gatherSources(input.subjectId, input.papers, input.settings.style);
  const names = new Map(input.scope.map((t) => [t.id, t.name]));
  const scope = input.scope.map((t) => t.id);
  const total = input.settings.marks;
  const repeatShare = input.settings.pyqRepeat ? Math.floor(total * PYQ_REPEAT_SHARE) : 0;
  // Plain recall is a warm-up only, prerequisites a small share: at most this many marks.
  const recallShare = Math.floor(total * RECALL_SHARE);
  const prereqShare = Math.floor(total * PREREQ_SHARE);
  const common = {
    subject: input.subjectId,
    ...(input.custom ? { custom: input.custom } : {}),
    scope,
    ...(sources.syllabus ? { syllabus: sources.syllabus } : {}),
  };

  /** One writer request for a batch of slots; `kept` are the paper's other questions. */
  async function write(
    batch: PlannedSection,
    kept: readonly PaperQuestion[],
    feedback: readonly Feedback[] = [],
  ): Promise<PaperQuestion[]> {
    const topics = [...new Set(batch.slots.map((s) => s.topic))];
    const topicNames = topics.map((t) => names.get(t) ?? t).join(", ");
    const facts = Object.fromEntries(
      topics.flatMap((t) => {
        const list = sources.facts.get(t);
        return list?.length ? [[t, list]] : [];
      }),
    );
    const material = searchChunks(sources.chunks, topicNames, 6).map((c) => c.text.slice(0, 800));
    const repeatLeft = repeatShare - marksOf(kept, (q) => q.source === "pyq-repeat");
    const reply = await postJson(
      "/api/mock-test",
      {
        ...common,
        section: batch,
        facts,
        material,
        pyqs: closestPyqs(sources.pyqs, topicNames),
        pyqRepeat: repeatLeft > 0,
        pyqRepeatMarks: Math.max(0, repeatLeft),
        difficulty: input.settings.difficulty,
        styleNote: input.styleNote,
        avoid: kept.map((q) => q.question.slice(0, 200)).slice(-40),
        recallMarks: Math.max(0, recallShare - marksOf(kept, (q) => isRecall(q.question))),
        prereqMarks: Math.max(0, prereqShare - marksOf(kept, (q) => q.relevance === "B")),
        ...(feedback.length ? { feedback } : {}),
      },
      { signal, retryBad: true, onWait },
    );
    delete progress.waiting;
    return (reply.questions as PaperQuestion[]) ?? [];
  }

  /** One examiner call per EXAMINE_LIMIT questions (one call for a normal paper). */
  async function examine(
    questions: readonly PaperQuestion[],
    accepted: readonly PaperQuestion[],
  ): Promise<Verdict[]> {
    const out: Verdict[] = [];
    for (let i = 0; i < questions.length; i += EXAMINE_LIMIT) {
      const chunk = questions.slice(i, i + EXAMINE_LIMIT);
      const others = [...accepted, ...questions.filter((q) => !chunk.includes(q))];
      const reply = await postJson(
        "/api/mock-test/verify",
        {
          ...common,
          questions: chunk,
          accepted: others.map((q) => q.question.slice(0, 300)).slice(0, 60),
        },
        { signal, retryBad: true, onWait },
      );
      delete progress.waiting;
      out.push(...((reply.results as Verdict[]) ?? []));
    }
    return out;
  }

  const written: PaperQuestion[] = [];
  const sections: PaperSection[] = [];
  for (const [si, section] of input.plan.entries()) {
    const questions: PaperQuestion[] = [];
    for (const batch of batches(section)) {
      const got = await write(batch, written);
      questions.push(...got);
      written.push(...got);
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
  const draft: Paper = {
    title: input.title,
    subject: input.subjectId,
    totalMarks: total,
    minutes: input.settings.minutes,
    sections,
  };

  let paper: Paper;
  try {
    ({ paper } = await reviewPaper(draft, input.plan, {
      examine,
      rewrite: (batch, feedback, accepted) => write(batch, accepted, feedback),
      onProgress: ({ stage, failing }) => {
        progress.stage = stage;
        progress.failing = failing;
        report();
      },
    }));
  } catch (err) {
    if (err instanceof ReviewFailed) {
      console.warn("[mock] questions still failing the examiner:", err.failing);
      throw new MockError("bad-response", "examiner");
    }
    throw err;
  }
  const problems = paperProblems(paper, new Set(scope), total, input.plan);
  if (problems.length) {
    console.warn("[mock] paper failed the final check:", problems.join("; "));
    throw new MockError("bad-response");
  }
  return paper;
}

/**
 * Saves a finished paper-mode mock (synced) as soon as Finish is pressed: what it covered and the
 * time taken. `score: null` saves it unmarked; the student's total is added later with
 * markMockResult. Shown in Past mocks and on the Dashboard. Returns the saved record's id.
 */
export async function saveMockResult(input: {
  subjectId: string;
  title: string;
  scope: { level: "subject" | "units" | "topics"; ids: string[]; label: string };
  settings: MockSettings;
  paper: Paper;
  score: number | null;
  timeTakenSec: number;
}): Promise<string> {
  const units = [...new Set(input.scope.level === "units" ? input.scope.ids : [])];
  return recordMockResult({
    subject: input.subjectId,
    chapter: units.length === 1 ? units[0] : "multiple",
    level: "exam-prep",
    minutes: input.settings.minutes,
    title: input.title,
    score: input.score ?? 0,
    ...(input.score === null ? { unmarked: true as const } : {}),
    total: input.paper.totalMarks,
    // Paper mode has no per-question marks, so no topic split (and no weak-topic signal).
    byTopic: [],
    scope: input.scope,
    settings: input.settings,
    paper: input.paper,
    mode: "paper",
    timeTakenSec: Math.max(0, Math.round(input.timeTakenSec)),
  });
}

export async function loadMockPrefs(subjectId: string): Promise<MockSettings | undefined> {
  return (await getSettings().catch(() => undefined))?.mockPrefs?.[subjectId];
}

export async function saveMockPrefs(subjectId: string, settings: MockSettings): Promise<void> {
  const prefs = (await getSettings().catch(() => undefined))?.mockPrefs ?? {};
  await updateSettings({ mockPrefs: { ...prefs, [subjectId]: settings } }).catch(() => undefined);
}

/*
 * npm run eval — generates a lesson for every golden-set topic with the real pipeline
 * (grounding → writing → checks → fact-check) and reports how many key facts are stated,
 * per subject, plus visual checks (SPEC §6.1 rules 5–6, §4.1).
 *
 *   npm run eval                              every subject with a golden set
 *   npm run eval -- --subject=engg-math       one subject
 *   npm run eval -- --topics=gauss-law,ohms-law
 *   npm run eval -- --level=last-minute --duration=5
 *   npm run eval -- --fake                    dry run with the fake AI (checks the harness)
 *   npm run eval -- --max-topics=10           at most 10 new topics this run (quota-friendly)
 *   npm run eval -- --fresh                   ignore saved progress and start again
 *   npm run eval -- --retry-failed            regenerate only lessons that failed to generate
 *
 * Resumable (SPEC §12.7): each topic's result is saved as soon as it is done, in
 * eval/results/progress/. A rerun skips finished topics. On a rate limit it waits (30 s, 60 s,
 * 2 min, 4 min); if the quota is still used up it saves and stops, saying to resume later.
 * Scores are recorded only once every topic of a subject is done.
 *
 * Needs GEMINI_API_KEY (or GROQ_API_KEY) in .env.local. Free-tier friendly: it pauses
 * between topics. Each real run appends its scores to EVAL_LOG.md, writes
 * eval/results/<subject>.json and updates src/data/accuracy.json (the /accuracy page).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadGoldenSets } from "./golden";
import {
  lessonText,
  overallPercent,
  quotedShare,
  scoreLesson,
  tierForScore,
  visualReport,
  type Golden,
  type TopicScore,
} from "./score";
import { LlmError } from "@/lib/llm/types";
import { generateLesson } from "@/lib/generateLesson";
import { groundSources } from "@/lib/grounding/groundSources";
import { validateLessonRequest } from "@/lib/lessonRequest";
import { FakeProvider } from "@/lib/llm/fake";
import { fakeLessonBody, fakeVerification } from "@/lib/llm/fakeLesson";
import { generateJsonWithFallback, providersFromEnv } from "@/lib/llm/providers";
import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";
import { PROMPT_VERSION } from "@/lib/prompts/lessonPrompt";
import { sourcesForTopic } from "@/lib/sources";
import { findSubject } from "@/lib/subjects";
import { verifyLesson } from "@/lib/verify";
import { findVisualProblems, visualPromptRules } from "@/visuals/visualChecks";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const level = args.level ?? "first-encounter";
const duration = args.duration ?? "10";
const fake = args.fake === "true";
const delayMs = Number(args.delay ?? (fake ? 0 : 4000));
const maxTopics = Number(args["max-topics"] ?? Infinity);
const fresh = args.fresh === "true";
const allSets: Golden[] = loadGoldenSets();
const sets = allSets.filter((s) => !args.subject || s.subject === args.subject);

function chainFor(sources: ReturnType<typeof sourcesForTopic>, topic: string): LlmProvider[] {
  if (!fake) return providersFromEnv();
  const body = fakeLessonBody(sources, topic);
  return [
    new FakeProvider((o) =>
      JSON.stringify(o.system.includes("fact-checker") ? fakeVerification(body) : body),
    ),
  ];
}

if (!fake && providersFromEnv().length === 0) {
  console.error("No AI key found. Add GEMINI_API_KEY to .env.local (or run with --fake).");
  process.exit(1);
}

type Row = TopicScore & {
  valid: boolean;
  sourced: string;
  corrections: number;
  visuals: number;
  visualIssues: string[];
  error?: string;
};

/** Waits between attempts after a rate limit; after the last one the run stops for today. */
const RATE_LIMIT_WAITS_MS = [30_000, 60_000, 120_000, 240_000];
class QuotaExhausted extends Error {}
let newTopicsThisRun = 0;

function progressPath(subject: string): string {
  return `eval/results/progress/${subject}-${level}-${duration}-${PROMPT_VERSION}${fake ? "-fake" : ""}.json`;
}

function loadProgress(subject: string): Record<string, Row> {
  const file = progressPath(subject);
  if (fresh || !existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, Row>;
  } catch {
    return {};
  }
}

function saveProgress(subject: string, done: Record<string, Row>) {
  mkdirSync("eval/results/progress", { recursive: true });
  writeFileSync(progressPath(subject), JSON.stringify(done, null, 2));
}

/** Runs one call, waiting and retrying on rate limits; throws QuotaExhausted when it gives up. */
async function withRateLimitRetry<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await work();
    } catch (err) {
      const limited = err instanceof LlmError && err.kind === "rate-limit";
      if (!limited) throw err;
      if (attempt >= RATE_LIMIT_WAITS_MS.length) throw new QuotaExhausted(String(err));
      const wait = RATE_LIMIT_WAITS_MS[attempt];
      console.log(`   rate limited: waiting ${wait / 1000} s before trying again…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function runSet(set: Golden): Promise<{ percent: number; rows: Row[]; complete: boolean }> {
  const topics = args.topics
    ? set.topics.filter((t) => args.topics.split(",").includes(t.topic))
    : set.topics;
  const subject = findSubject(set.subject)!;
  console.log(
    `\n${subject.name} · ${topics.length} topics · level ${level} · ${duration} min${fake ? " · FAKE AI" : ""}\n`,
  );
  const rows: Row[] = [];
  const done = loadProgress(set.subject);
  // --retry-failed: lessons that failed to generate (not ones that missed facts) get one more go.
  if (args["retry-failed"] === "true") {
    for (const t of topics) if (done[t.topic] && !done[t.topic].valid) delete done[t.topic];
  }
  const already = topics.filter((t) => done[t.topic]).length;
  if (already) console.log(`Resuming: ${already} of ${topics.length} topics already done.\n`);

  for (const [i, entry] of topics.entries()) {
    if (done[entry.topic]) {
      rows.push(done[entry.topic]);
      continue;
    }
    if (newTopicsThisRun >= maxTopics) {
      console.log(`Stopping after ${maxTopics} new topics (--max-topics). Run again to continue.`);
      return { percent: overallPercent(rows), rows, complete: false };
    }
    newTopicsThisRun++;
    const request = validateLessonRequest({
      subject: set.subject,
      chapter: entry.chapter,
      topic: entry.topic,
      level,
      duration,
    });
    if (!request.ok) throw new Error(`bad golden entry ${entry.topic}`);
    const started = Date.now();
    try {
      const sources = await groundSources(sourcesForTopic(set.subject, entry.topic));
      const chain = chainFor(sources, entry.topic);
      const generate = (o: GenerateOptions) =>
        withRateLimitRetry(() => generateJsonWithFallback(chain, o));
      const draft = await generateLesson(request.request, {
        generate,
        emit: () => {},
        sources,
        visualRules: visualPromptRules(entry.topic, {
          field: request.request.subject.field,
          level: request.request.level.slug,
        }),
      });
      const { lesson, applied } = await verifyLesson(draft, sources, generate);
      const score = scoreLesson(lesson, entry);
      // Kept (git-ignored) so a missed fact can be checked by hand: real gap, or a strict pattern?
      mkdirSync(`eval/results/lessons/${set.subject}`, { recursive: true });
      writeFileSync(`eval/results/lessons/${set.subject}/${entry.topic}.txt`, lessonText(lesson));
      const excerpts = Object.fromEntries(sources.map((s) => [s.id, s.excerpt ?? ""]));
      const visuals = visualReport(lesson, findVisualProblems(lesson), excerpts);
      const visualIssues = [...visuals.invalid, ...visuals.unsupportedNumbers];
      const sourced = lesson.sections.filter((s) => s.check?.status === "sourced").length;
      const row: Row = {
        ...score,
        valid: true,
        sourced: `${sourced}/${lesson.sections.length}`,
        corrections: applied,
        visuals: visuals.visuals,
        visualIssues,
      };
      rows.push(row);
      done[entry.topic] = row;
      saveProgress(set.subject, done);
      console.log(
        `${String(i + 1).padStart(2)}. ${entry.topic.padEnd(28)} facts ${score.found.length}/${entry.facts.length}` +
          `  sourced ${sourced}/${lesson.sections.length}  visuals ${visuals.visuals}${visualIssues.length ? ` (${visualIssues.length} issues)` : ""}` +
          `  fixes ${applied}  ${((Date.now() - started) / 1000).toFixed(0)}s` +
          (score.missing.length ? `  missing: ${score.missing.join(", ")}` : ""),
      );
    } catch (err) {
      if (err instanceof QuotaExhausted) {
        console.log(
          `\nThe free AI quota is used up for now. Progress is saved (${Object.keys(done).length} of ${topics.length} topics); run the same command later to continue.`,
        );
        throw err;
      }
      const failedRow: Row = {
        topic: entry.topic,
        found: [],
        missing: entry.facts.map((f) => f.id),
        valid: false,
        sourced: "0/0",
        corrections: 0,
        visuals: 0,
        visualIssues: [],
        error: String(err),
      };
      rows.push(failedRow);
      // A lesson that failed for another reason counts as a miss, and is saved like any result.
      done[entry.topic] = failedRow;
      saveProgress(set.subject, done);
      console.log(
        `${String(i + 1).padStart(2)}. ${entry.topic.padEnd(28)} FAILED: ${String(err).slice(0, 120)}`,
      );
    }
    if (delayMs && i < topics.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }

  const percent = overallPercent(rows);
  const valid = rows.filter((r) => r.valid).length;
  const issues = rows.reduce((s, r) => s + r.visualIssues.length, 0);
  console.log(
    `\n${subject.name}: key facts stated ${percent}%  ·  valid lessons ${valid}/${rows.length}  ·  visual issues ${issues}  ·  target ≥ 95%`,
  );
  return { percent, rows, complete: true };
}

async function main() {
  const now = new Date();
  // Local calendar date (the log is read by people in their own time zone).
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const date = now.toISOString();
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest (+ fallbacks)";
  const results: { subject: string; percent: number; rows: Row[]; complete: boolean }[] = [];
  try {
    for (const set of sets) results.push({ subject: set.subject, ...(await runSet(set)) });
  } catch (err) {
    if (err instanceof QuotaExhausted) process.exit(2);
    throw err;
  }

  mkdirSync("eval/results", { recursive: true });
  for (const r of results) {
    writeFileSync(
      `eval/results/${r.subject}.json`,
      JSON.stringify({ date, level, duration, fake, percent: r.percent, rows: r.rows }, null, 2),
    );
  }

  // A full real run (not --topics, not --fake) is recorded for the regression log and the
  // public accuracy page.
  // Only subjects whose every topic is done are recorded.
  const finished = results.filter((r) => r.complete);
  if (!fake && !args.topics && finished.length > 0) {
    if (!existsSync("EVAL_LOG.md")) {
      writeFileSync(
        "EVAL_LOG.md",
        "# Eval log\n\nEvery full `npm run eval` run (SPEC §6.1 rule 6). A verified subject must stay at or above 95%.\n\n| Date | Subject | Level · length | Topics | Key facts | Valid lessons | Visuals (issues) | Prompt | Model |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n",
      );
    }
    const accuracyPath = "src/data/accuracy.json";
    const accuracy = JSON.parse(readFileSync(accuracyPath, "utf8")) as {
      subjects: Record<string, unknown>;
    };
    for (const r of finished) {
      const set = sets.find((s) => s.subject === r.subject)!;
      const share = quotedShare(set);
      const recommendedTier = tierForScore(r.percent, { topics: set.topics.length, ...share });
      const facts = set.topics.reduce((s, t) => s + t.facts.length, 0);
      const valid = r.rows.filter((x) => x.valid).length;
      const visuals = r.rows.reduce((s, x) => s + x.visuals, 0);
      const issues = r.rows.reduce((s, x) => s + x.visualIssues.length, 0);
      appendFileSync(
        "EVAL_LOG.md",
        `| ${day} | ${r.subject} | ${level} · ${duration} min | ${set.topics.length} | **${r.percent}%** (${facts} facts) | ${valid}/${r.rows.length} | ${visuals} (${issues}) | ${PROMPT_VERSION} | ${model} |\n`,
      );
      accuracy.subjects[r.subject] = {
        goldenTopics: set.topics.length,
        facts,
        percent: r.percent,
        validLessons: valid,
        lessons: r.rows.length,
        date: day,
        level,
        promptVersion: PROMPT_VERSION,
        quotedFacts: share.quoted,
        // What the score earns under SPEC §12.3; a person reviews samples before it is applied.
        recommendedTier,
      };
      console.log(
        `${r.subject}: recommended tier "${recommendedTier}" (${share.quoted}/${share.total} facts have source quotes)`,
      );
    }
    writeFileSync(accuracyPath, `${JSON.stringify(accuracy, null, 2)}\n`);
    console.log("Recorded in EVAL_LOG.md and src/data/accuracy.json");
  }
  const failed = results.some((r) => r.percent < 95);
  process.exit(failed && !fake ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

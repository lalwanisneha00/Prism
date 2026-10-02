/*
 * npm run eval — generates a lesson for every golden-set topic with the real pipeline
 * (grounding → writing → checks → fact-check) and reports how many key facts are stated.
 *
 *   npm run eval                         all 15 topics, First Encounter, 10 min
 *   npm run eval -- --level=last-minute  another level
 *   npm run eval -- --topics=gauss-law,ohms-law
 *   npm run eval -- --fake               dry run with the fake AI (no key, checks the harness)
 *
 * Needs GEMINI_API_KEY (or GROQ_API_KEY) in .env.local. Free-tier friendly: it pauses
 * between topics. Results are written to eval/results/latest.json.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import golden from "./golden.json";
import { GoldenSchema, overallPercent, scoreLesson, type TopicScore } from "./score";
import { generateLesson } from "@/lib/generateLesson";
import { groundSources } from "@/lib/grounding/groundSources";
import { validateLessonRequest } from "@/lib/lessonRequest";
import { FakeProvider } from "@/lib/llm/fake";
import { fakeLessonBody, fakeVerification } from "@/lib/llm/fakeLesson";
import { generateJsonWithFallback, providersFromEnv } from "@/lib/llm/providers";
import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";
import { sourcesForTopic } from "@/lib/sources";
import { verifyLesson } from "@/lib/verify";
import { visualPromptRules } from "@/visuals/visualChecks";

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
const set = GoldenSchema.parse(golden);
const topics = args.topics
  ? set.topics.filter((t) => args.topics.split(",").includes(t.topic))
  : set.topics;

function chainFor(sources: ReturnType<typeof sourcesForTopic>): LlmProvider[] {
  if (!fake) return providersFromEnv();
  const body = fakeLessonBody(sources);
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

type Row = TopicScore & { valid: boolean; sourced: string; corrections: number; error?: string };

async function main() {
  console.log(
    `Golden-set eval · ${topics.length} topics · level ${level} · ${duration} min${fake ? " · FAKE AI" : ""}\n`,
  );

  const rows: Row[] = [];

  for (const [i, entry] of topics.entries()) {
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
      const chain = chainFor(sources);
      const generate = (o: GenerateOptions) => generateJsonWithFallback(chain, o);
      const draft = await generateLesson(request.request, {
        generate,
        emit: () => {},
        sources,
        visualRules: visualPromptRules(entry.topic),
      });
      const { lesson, applied } = await verifyLesson(draft, sources, generate);
      const score = scoreLesson(lesson, entry);
      const sourced = lesson.sections.filter((s) => s.check?.status === "sourced").length;
      rows.push({
        ...score,
        valid: true,
        sourced: `${sourced}/${lesson.sections.length}`,
        corrections: applied,
      });
      console.log(
        `${String(i + 1).padStart(2)}. ${entry.topic.padEnd(22)} facts ${score.found.length}/${entry.facts.length}` +
          `  sourced ${sourced}/${lesson.sections.length}  fixes ${applied}  ${((Date.now() - started) / 1000).toFixed(0)}s` +
          (score.missing.length ? `  missing: ${score.missing.join(", ")}` : ""),
      );
    } catch (err) {
      rows.push({
        topic: entry.topic,
        found: [],
        missing: entry.facts.map((f) => f.id),
        valid: false,
        sourced: "0/0",
        corrections: 0,
        error: String(err),
      });
      console.log(
        `${String(i + 1).padStart(2)}. ${entry.topic.padEnd(22)} FAILED: ${String(err).slice(0, 120)}`,
      );
    }
    if (delayMs && i < topics.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }

  const percent = overallPercent(rows);
  const valid = rows.filter((r) => r.valid).length;
  console.log(
    `\nKey facts stated: ${percent}%   ·   valid lessons: ${valid}/${rows.length}   ·   target ≥ 95%`,
  );

  mkdirSync("eval/results", { recursive: true });
  writeFileSync(
    "eval/results/latest.json",
    JSON.stringify(
      { date: new Date().toISOString(), level, duration, fake, percent, rows },
      null,
      2,
    ),
  );
  console.log("Saved eval/results/latest.json");
  process.exit(percent >= 95 || fake ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

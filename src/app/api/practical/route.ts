import { z } from "zod";
import { KEY_HEADERS } from "@/lib/byok/catalogue";
import { getAdmin } from "@/lib/firebase/admin";
import { groundSources } from "@/lib/grounding/groundSources";
import { searchWikipedia } from "@/lib/grounding/wikipedia";
import { adminLibraryStore } from "@/lib/library/adminStore";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { FakeProvider } from "@/lib/llm/fake";
import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";
import { LAB_CONFIG } from "@/lib/labs/config";
import { findExperiment, theoryLinksFor } from "@/lib/labs/experiment";
import { archetypeById, classifyExperiment, type Archetype } from "@/lib/labs/archetypes";
import { fakeLabReply } from "@/lib/labs/fakeLab";
import { generateLab } from "@/lib/labs/generateLab";
import type { LabLesson } from "@/lib/labs/labLesson";
import type { LabSimulation } from "@/lib/labs/practicalSchema";
import type { PracticalEvent } from "@/lib/labs/practicalEvents";
import {
  adminSimulationStore,
  keptSimulation,
  practicalKey,
  readPractical,
  writePractical,
} from "@/lib/labs/practicalLibrary";
import { practicalStoresForTests, type PracticalStores } from "@/lib/labs/practicalStores";
import { shortlistTemplates } from "@/lib/labs/templates";
import { virtualLabFor } from "@/lib/labs/virtualLabs";
import { searchedSources } from "@/lib/sources";
import { knownProblems } from "@/lib/syllabusFix/lessonReview";
import { adminLessonFlagStore, type RegenerationClaim } from "@/lib/syllabusFix/lessonFlagStore";
import { liveStaleTopics } from "@/lib/syllabusFix/liveFixes";
import { adminProposalStore } from "@/lib/syllabusFix/proposalStore";

/*
 * POST /api/practical { subject, topic, fresh? } (syllabus fix, Phase 7B, formats from 7C): the
 * lesson of one lab experiment, in its archetype's format, as a stream of PracticalEvent lines. One lesson per experiment, kept in the
 * shared library; enough student flags rebuild it once with their reports (the same rules as
 * theory lessons). The AI key is only used here, on the server.
 */

// A lab lesson is a big JSON reply (about a minute per AI call, up to two calls with a repair).
// Vercel's free plan allows up to 300 s when Fluid Compute is on (Settings, Functions).
export const maxDuration = 300;

const RequestSchema = z.object({
  subject: z.string().min(1).max(160),
  topic: z.string().min(1).max(160),
  fresh: z.boolean().optional(),
});

async function stores(): Promise<PracticalStores | null> {
  const injected = practicalStoresForTests();
  if (injected !== undefined) return injected;
  if (process.env.LLM_PROVIDER === "fake") return null;
  const admin = await getAdmin();
  if (!admin) return null;
  return {
    library: adminLibraryStore(admin.db),
    flags: adminLessonFlagStore(admin.db),
    simulations: adminSimulationStore(admin.db),
    stale: () => liveStaleTopics(adminProposalStore(admin.db)),
  };
}

function providers(): LlmProvider[] {
  // LLM_PROVIDER=fake writes a canned lab lesson: for testing without an API key.
  if (process.env.LLM_PROVIDER === "fake")
    return [new FakeProvider((o) => fakeLabReply(o.system), 150)];
  return providersFromEnv();
}

/** "Gemini (gemini-flash-latest)" → provider and model. */
function generatedBy(writer: LlmProvider | undefined, ownKey: boolean) {
  const name = writer?.name ?? "AI";
  const open = name.indexOf("(");
  return {
    provider: open > 0 ? name.slice(0, open).trim() : name,
    model: open > 0 ? name.slice(open + 1).replace(/\)$/, "") : "",
    ownKey,
  };
}

const hasSimulationSection = (a: Archetype) => a.sections.some((s) => s.kind === "simulation");

/** The simulation a lesson ended up with (its archetype's simulation section, if any). */
function simulationOf(lesson: LabLesson): LabSimulation | null {
  const archetype = archetypeById(lesson.archetype);
  const id = archetype?.sections.find((s) => s.kind === "simulation")?.id;
  return id ? ((lesson.sections[id] as LabSimulation | null | undefined) ?? null) : null;
}

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  const found = body.success ? findExperiment(body.data.subject, body.data.topic) : null;
  if (!body.success || !found) {
    const event: PracticalEvent = {
      type: "error",
      kind: "invalid-request",
      message: "That experiment is not in Prism's lab list.",
    };
    return Response.json(event, { status: body.success ? 404 : 400 });
  }
  const { subject, chapter, topic } = found;
  const fresh = Boolean(body.data.fresh);
  const key = practicalKey(subject.id, topic.id);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: PracticalEvent) => {
        if (req.signal.aborted) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const shared = await stores();
        let claim: RegenerationClaim | null = null;
        let underReview = false;
        if (shared && !fresh) {
          const status = await shared.flags.status(key).catch(() => undefined);
          underReview = status?.state === "review";
          if (status?.state === "needs_regeneration")
            claim = await shared.flags.claim(key, new Date().toISOString()).catch(() => null);
        }
        if (shared && !fresh && !claim) {
          const stale = await shared.stale();
          const stored = await readPractical(shared.library, key, stale, () =>
            send({ type: "updating" }),
          ).catch(() => null);
          if (stored) {
            send({
              type: "lesson",
              lesson: stored,
              cached: true,
              ...(underReview ? { underReview } : {}),
            });
            return;
          }
        }

        send({ type: "stage", stage: "sources", message: "Reading trusted sources…" });
        const course = subject.name.replace(/\s*\(.*$/, "").replace(/\s+lab(oratory)?$/i, "");
        const sources = await groundSources(
          await searchedSources(topic.name.slice(0, 120), course, (q, limit) =>
            searchWikipedia(q, limit, { signal: req.signal }),
          ).catch(() => []),
          { signal: req.signal },
        );
        const shortlist = shortlistTemplates(topic, subject.name, LAB_CONFIG.shortlist);
        const theoryLinks = theoryLinksFor(subject, topic);
        const virtualLab = virtualLabFor(topic);
        // A simulation chosen before is kept, unless students reported that it is wrong.
        const simFlagged = claim?.flags.some((f) => f.type === "simulation-wrong") ?? false;
        const saved = keptSimulation(
          shared && !simFlagged
            ? await shared.simulations.chosen(subject.id, topic.id).catch(() => undefined)
            : undefined,
          shortlist.length,
        );

        const chain = chainFor(req, providers);
        let writer: LlmProvider | undefined;
        const generate = (options: GenerateOptions) =>
          generateJsonWithFallback(chain, options, undefined, undefined, (p) => {
            writer = p;
          });
        const archetype = classifyExperiment(subject, topic).archetype;
        const { lesson, circuitFallback } = await generateLab(
          {
            subject: {
              id: subject.id,
              name: subject.name,
              code: subject.code,
              field: subject.field,
            },
            experiment: { id: topic.id, name: topic.name, number: topic.number, aim: topic.aim },
            theoryTopics: theoryLinks.map((l) => l.name),
          },
          {
            generate,
            archetype,
            sources,
            shortlist,
            fixedSimulation: saved,
            ...(claim ? { knownProblems: knownProblems(claim.flags) } : {}),
            meta: {
              subject: subject.id,
              chapter: chapter.id,
              topic: topic.id,
              title: topic.name,
              ...(topic.number ? { number: topic.number } : {}),
              ...(theoryLinks.length ? { theoryLinks } : {}),
              ...(virtualLab ? { virtualLab } : {}),
            },
            onStage: (stage, attempt) =>
              send({
                type: "stage",
                stage,
                message:
                  stage === "writing"
                    ? "Writing your lab lesson…"
                    : `Fixing a few problems (attempt ${attempt})…`,
              }),
            onProblems: (problems, attempt) =>
              console.warn(
                `[api/practical] ${subject.id}/${topic.id} try ${attempt} (${archetype.id}): ${problems.slice(0, 6).join(" | ")}`,
              ),
            signal: req.signal,
          },
        );
        const final = {
          ...lesson,
          meta: {
            ...lesson.meta,
            generatedBy: generatedBy(writer, req.headers.has(KEY_HEADERS.key)),
          },
        };

        const at = new Date().toISOString();
        let stored = false;
        if (shared) {
          if (saved === undefined && hasSimulationSection(archetype))
            await shared.simulations
              .save(subject.id, topic.id, simulationOf(final), at)
              .catch(() => undefined);
          const simulation = simulationOf(final);
          if (circuitFallback)
            await shared.simulations
              .gap({
                subject: subject.id,
                topic: topic.id,
                experiment: topic.name,
                course: subject.name,
                at,
                kind: "circuit",
              })
              .catch(() => undefined);
          if (hasSimulationSection(archetype) && !simulation)
            await shared.simulations
              .gap({
                subject: subject.id,
                topic: topic.id,
                experiment: topic.name,
                course: subject.name,
                at,
              })
              .catch(() => undefined);
          // The flagged version is kept (lessonVersions) before the new one takes its place.
          if (claim) await shared.flags.archive(key, claim.version).catch(() => undefined);
          stored = await writePractical(shared.library, final).catch(() => false);
          if (claim && stored)
            await shared.flags
              .finish(
                key,
                claim.flags.map((f) => f.type),
                at,
              )
              .catch(() => undefined);
        }
        send({
          type: "lesson",
          lesson: final,
          cached: false,
          ...(claim && stored ? { rebuiltFromFlags: true } : {}),
        });
      } catch (err) {
        if (req.signal.aborted) return;
        const error = err instanceof LlmError ? err : new LlmError("unavailable", String(err));
        console.error(`[api/practical] ${subject.id}/${topic.id}:`, error.message);
        send({ type: "error", kind: error.kind, message: errorCopy[error.kind].message });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed because the student left the page.
        }
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}

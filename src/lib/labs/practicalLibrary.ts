import type { Firestore } from "firebase-admin/firestore";
import { z } from "zod";
import { gunzipJson, gzipJson } from "@/lib/compress";
import { MAX_LESSON_BYTES, type LibraryStore } from "@/lib/library/sharedLibrary";
import { LAB_CONFIG } from "@/lib/labs/config";
import { parseLab, type LabLesson, type LabLessonAny } from "@/lib/labs/labLesson";
import { LAB_PROMPT_VERSION } from "@/lib/labs/labPrompt";
import {
  LabSimulationSchema,
  parsePractical,
  PRACTICAL_DURATION,
  PRACTICAL_LEVEL,
  type LabSimulation,
} from "@/lib/labs/practicalSchema";
import { PRACTICAL_PROMPT_VERSION } from "@/lib/labs/practicalPrompt";
import { isLessonStale, type StaleTopics } from "@/lib/syllabusFix/stale";

/*
 * Practical lessons in the shared lesson library (syllabus fix, Phase 7B): the same `lessons`
 * collection and document shape as theory lessons, keyed `{subject}_{experiment}_practical_1`, so
 * lesson flags, rebuilds and kept versions (Phase 5) work for them unchanged. Phase 7C lessons
 * (archetype formats) are stored the same way with their own prompt version; Phase 7B ones are
 * read only while `LAB_CONFIG.keepPhase7BLessons` is on.
 */

/** The same shape as `libraryKey` (subject_topic_level_duration), which lesson flags use too. */
export const practicalKey = (subject: string, topic: string) =>
  `${subject}_${topic}_${PRACTICAL_LEVEL}_${PRACTICAL_DURATION}`;

export async function readPractical(
  store: LibraryStore,
  key: string,
  stale: StaleTopics,
  onStale?: () => void,
  keepPhase7B: boolean = LAB_CONFIG.keepPhase7BLessons,
): Promise<LabLessonAny | null> {
  const doc = await store.get(key);
  if (!doc?.lessonGz) return null;
  const v2 = doc.promptVersion === LAB_PROMPT_VERSION;
  if (!v2 && !(keepPhase7B && doc.promptVersion === PRACTICAL_PROMPT_VERSION)) return null;
  const data = await gunzipJson(doc.lessonGz);
  const parsed = v2 ? parseLab(data) : parsePractical(data);
  if (!parsed.ok) return null;
  const { subject, topic } = parsed.lesson.meta;
  if (!isLessonStale(stale, subject, topic, doc.createdAt)) return parsed.lesson;
  onStale?.();
  return null;
}

export async function writePractical(store: LibraryStore, lesson: LabLesson): Promise<boolean> {
  const lessonGz = await gzipJson(lesson);
  if (lessonGz.byteLength > MAX_LESSON_BYTES) return false;
  const { subject, topic, title } = lesson.meta;
  await store.set(practicalKey(subject, topic), {
    lessonGz,
    subject,
    topic,
    level: PRACTICAL_LEVEL,
    durationMin: PRACTICAL_DURATION,
    title,
    createdAt: new Date().toISOString(),
    schemaVersion: 1,
    promptVersion: LAB_PROMPT_VERSION,
    tier: "sourced",
    sourceIds: lesson.meta.sources.map((s) => s.id),
  });
  return true;
}

/**
 * The simulation chosen for each experiment (`labSimulations/{subject}__{topic}`), so a rebuilt
 * lesson keeps it instead of the AI choosing again; and experiments no template fits
 * (`labSimulationGaps/{subject}__{topic}`), for docs/SIMULATION_GAPS.md (`npm run labs:gaps`).
 */
export const SavedSimulationSchema = z.object({
  simulation: LabSimulationSchema.nullable(),
  at: z.string(),
});

export type SimulationGap = {
  subject: string;
  topic: string;
  experiment: string;
  course: string;
  at: string;
  /** What is missing: a simulation template (default), or a circuit that failed its checks twice. */
  kind?: "simulation" | "circuit";
};

export interface SimulationStore {
  chosen(subject: string, topic: string): Promise<LabSimulation | null | undefined>;
  save(subject: string, topic: string, simulation: LabSimulation | null, at: string): Promise<void>;
  gap(entry: SimulationGap): Promise<void>;
}

/**
 * The saved choice a rebuilt lesson must keep. "None fits" (null) is kept only while no template
 * matches the experiment; once a new template matches, the AI may choose again (it is part of the
 * same lesson call, so it costs nothing extra).
 */
export function keptSimulation(
  saved: LabSimulation | null | undefined,
  shortlistSize: number,
): LabSimulation | null | undefined {
  return saved === null && shortlistSize > 0 ? undefined : saved;
}

const docId = (subject: string, topic: string) => `${subject}__${topic}`;

export function adminSimulationStore(db: Firestore): SimulationStore {
  return {
    async chosen(subject, topic) {
      const data = (await db.collection("labSimulations").doc(docId(subject, topic)).get()).data();
      const parsed = SavedSimulationSchema.safeParse(data);
      return parsed.success ? parsed.data.simulation : undefined;
    },
    async save(subject, topic, simulation, at) {
      await db.collection("labSimulations").doc(docId(subject, topic)).set({ simulation, at });
    },
    async gap(entry) {
      const id = docId(entry.subject, entry.topic) + (entry.kind === "circuit" ? "__circuit" : "");
      await db.collection("labSimulationGaps").doc(id).set(entry);
    },
  };
}

export function memorySimulationStore(): SimulationStore & {
  saved: Map<string, LabSimulation | null>;
  gaps: SimulationGap[];
} {
  const saved = new Map<string, LabSimulation | null>();
  const gaps: SimulationGap[] = [];
  return {
    saved,
    gaps,
    async chosen(subject, topic) {
      const id = docId(subject, topic);
      return saved.has(id) ? saved.get(id) : undefined;
    },
    async save(subject, topic, simulation) {
      saved.set(docId(subject, topic), simulation);
    },
    async gap(entry) {
      gaps.push(entry);
    },
  };
}

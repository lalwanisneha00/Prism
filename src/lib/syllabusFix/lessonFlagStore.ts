import type { Firestore } from "firebase-admin/firestore";
import { libraryKey } from "@/lib/library/sharedLibrary";
import { findSubject } from "@/lib/subjects";
import { lessonFlagId, type LessonFlag } from "@/lib/syllabusFix/flags";
import {
  addTroubledLesson,
  afterFlag,
  afterRegeneration,
  LessonQualitySchema,
  LessonStatusSchema,
  newLessonStatus,
  shouldRegenerate,
  type FlagForPrompt,
  type LessonQuality,
  type LessonStatus,
} from "@/lib/syllabusFix/lessonReview";

/*
 * Where lesson flags live (syllabus fix, Phases 4 and 5): Firestore `lessonFlags/{lesson}__v{n}__{uid}`,
 * written only by the server. One flag per student per lesson version (a second flag replaces the
 * first). Phase 5: `lessonStatus/{lesson}` counts them and says when to rebuild, `lessonVersions/
 * {lesson}__v{n}` keeps every replaced lesson, `lessonQuality/{subject}` marks subjects and chapters
 * whose lessons keep needing fixes.
 */

export type LessonFlagRecord = LessonFlag & {
  uid: string;
  /** The shared library key of the lesson (subject_topic_level_duration). */
  lessonKey: string;
  branch?: string;
  semester?: number;
  at: string;
};

export type LessonFlagResult = { id: string; replaced: boolean; state: LessonStatus["state"] };

/** A rebuild this server may start: the version it replaces and what students reported. */
export type RegenerationClaim = { version: number; flags: FlagForPrompt[] };

export interface LessonFlagStore {
  /** Saves the flag on the current version; `replaced` = this student had flagged it before. */
  submit(record: LessonFlagRecord): Promise<LessonFlagResult>;
  status(lessonKey: string): Promise<LessonStatus | undefined>;
  /** Claims the rebuild of a lesson that needs one (null when none is due or another runs). */
  claim(lessonKey: string, at: string): Promise<RegenerationClaim | null>;
  /** Keeps the old lesson as `lessonVersions/{key}__v{n}` before the new one replaces it. */
  archive(lessonKey: string, version: number): Promise<void>;
  /** The new version is saved: count it, reset the flags. */
  finish(lessonKey: string, types: readonly string[], at: string): Promise<void>;
}

export function lessonFlagRecord(
  flag: LessonFlag,
  uid: string,
  profile: { branch?: string; semester?: number },
  at: string,
): LessonFlagRecord {
  return {
    ...flag,
    uid,
    lessonKey: libraryKey({
      subject: flag.subject,
      topic: flag.topic,
      level: flag.level,
      durationMin: flag.durationMin,
    } as Parameters<typeof libraryKey>[0]),
    ...(profile.branch ? { branch: profile.branch } : {}),
    ...(profile.semester ? { semester: profile.semester } : {}),
    at,
  };
}

/** The chapter a topic sits in (for the quality warning). */
function chapterOf(subject: string, topic: string): string | undefined {
  return findSubject(subject)?.chapters.find((c) => c.topics.some((t) => t.id === topic))?.id;
}

/** The status and quality writes one flag makes. Pure. */
export function planLessonFlag(
  record: LessonFlagRecord,
  before: LessonStatus | undefined,
  quality: LessonQuality | undefined,
): { status: LessonStatus; record: LessonFlagRecord; quality?: LessonQuality } {
  const start = before ?? newLessonStatus(record, record.at);
  // Flags always count for the version students see now (the app may not know it changed).
  const flag = { ...record, version: start.version };
  const status = afterFlag(start, record.uid, record.at);
  const troubled = start.state === "ok" && status.state !== "ok";
  return {
    status,
    record: flag,
    ...(troubled
      ? {
          quality: addTroubledLesson(
            quality,
            record.subject,
            chapterOf(record.subject, record.topic),
            record.at,
          ),
        }
      : {}),
  };
}

const toPrompt = (f: Partial<LessonFlagRecord>): FlagForPrompt => ({
  type: String(f.type ?? ""),
  ...(f.excerpt ? { excerpt: f.excerpt } : {}),
  ...(f.note ? { note: f.note } : {}),
});

export function adminLessonFlagStore(db: Firestore): LessonFlagStore {
  const col = db.collection("lessonFlags");
  const statusCol = db.collection("lessonStatus");
  const qualityCol = db.collection("lessonQuality");
  return {
    async submit(input) {
      return db.runTransaction(async (tx) => {
        const statusRef = statusCol.doc(input.lessonKey);
        const qualityRef = qualityCol.doc(input.subject);
        const [statusSnap, qualitySnap] = await tx.getAll(statusRef, qualityRef);
        const plan = planLessonFlag(
          input,
          LessonStatusSchema.safeParse(statusSnap.data()).data,
          LessonQualitySchema.safeParse(qualitySnap.data()).data,
        );
        const id = lessonFlagId(plan.record, plan.record.uid);
        const ref = col.doc(id);
        const before = await tx.get(ref);
        tx.set(ref, plan.record);
        tx.set(statusRef, plan.status);
        if (plan.quality) tx.set(qualityRef, plan.quality);
        return { id, replaced: before.exists, state: plan.status.state };
      });
    },
    async status(lessonKey) {
      const snap = await statusCol.doc(lessonKey).get();
      return LessonStatusSchema.safeParse(snap.data()).data;
    },
    async claim(lessonKey, at) {
      const ref = statusCol.doc(lessonKey);
      const version = await db.runTransaction(async (tx) => {
        const status = LessonStatusSchema.safeParse((await tx.get(ref)).data()).data;
        if (!status || !shouldRegenerate(status, Date.parse(at))) return null;
        tx.set(ref, { ...status, claimedAt: at, updatedAt: at });
        return status.version;
      });
      if (version === null) return null;
      // Two equality filters: Firestore needs no composite index for this.
      const flags = await col
        .where("lessonKey", "==", lessonKey)
        .where("version", "==", version)
        .get();
      return { version, flags: flags.docs.map((d) => toPrompt(d.data())) };
    },
    async archive(lessonKey, version) {
      const old = await db.collection("lessons").doc(lessonKey).get();
      if (old.exists)
        await db
          .collection("lessonVersions")
          .doc(`${lessonKey}__v${version}`)
          .set({ ...old.data(), version, archivedFrom: lessonKey });
    },
    async finish(lessonKey, types, at) {
      const ref = statusCol.doc(lessonKey);
      await db.runTransaction(async (tx) => {
        const status = LessonStatusSchema.safeParse((await tx.get(ref)).data()).data;
        if (status) tx.set(ref, afterRegeneration(status, types, at));
      });
    },
  };
}

/** In memory, for tests. */
export function memoryLessonFlagStore(): LessonFlagStore & {
  flags: Map<string, LessonFlagRecord>;
  statuses: Map<string, LessonStatus>;
  quality: Map<string, LessonQuality>;
  archived: string[];
} {
  const flags = new Map<string, LessonFlagRecord>();
  const statuses = new Map<string, LessonStatus>();
  const quality = new Map<string, LessonQuality>();
  const archived: string[] = [];
  return {
    flags,
    statuses,
    quality,
    archived,
    async submit(input) {
      const plan = planLessonFlag(input, statuses.get(input.lessonKey), quality.get(input.subject));
      const id = lessonFlagId(plan.record, plan.record.uid);
      const replaced = flags.has(id);
      flags.set(id, plan.record);
      statuses.set(input.lessonKey, plan.status);
      if (plan.quality) quality.set(input.subject, plan.quality);
      return { id, replaced, state: plan.status.state };
    },
    async status(lessonKey) {
      return statuses.get(lessonKey);
    },
    async claim(lessonKey, at) {
      const status = statuses.get(lessonKey);
      if (!status || !shouldRegenerate(status, Date.parse(at))) return null;
      statuses.set(lessonKey, { ...status, claimedAt: at, updatedAt: at });
      return {
        version: status.version,
        flags: [...flags.values()]
          .filter((f) => f.lessonKey === lessonKey && f.version === status.version)
          .map(toPrompt),
      };
    },
    async archive(lessonKey, version) {
      archived.push(`${lessonKey}__v${version}`);
    },
    async finish(lessonKey, types, at) {
      const status = statuses.get(lessonKey);
      if (status) statuses.set(lessonKey, afterRegeneration(status, types, at));
    },
  };
}

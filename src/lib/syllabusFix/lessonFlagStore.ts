import type { Firestore } from "firebase-admin/firestore";
import { libraryKey } from "@/lib/library/sharedLibrary";
import { lessonFlagId, type LessonFlag } from "@/lib/syllabusFix/flags";

/*
 * Where lesson flags live (syllabus fix, Phase 4): Firestore `lessonFlags/{lesson}__v{n}__{uid}`,
 * written only by the server. One flag per student per lesson version (a second flag replaces the
 * first). Phase 5 counts them and regenerates a lesson that collects enough.
 */

export type LessonFlagRecord = LessonFlag & {
  uid: string;
  /** The shared library key of the lesson (subject_topic_level_duration). */
  lessonKey: string;
  branch?: string;
  semester?: number;
  at: string;
};

export interface LessonFlagStore {
  /** Saves the flag; `replaced` = this student had flagged this lesson version before. */
  submit(record: LessonFlagRecord): Promise<{ id: string; replaced: boolean }>;
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

export function adminLessonFlagStore(db: Firestore): LessonFlagStore {
  const col = db.collection("lessonFlags");
  return {
    async submit(record) {
      const id = lessonFlagId(record, record.uid);
      const ref = col.doc(id);
      return db.runTransaction(async (tx) => {
        const before = await tx.get(ref);
        tx.set(ref, record);
        return { id, replaced: before.exists };
      });
    },
  };
}

/** In memory, for tests. */
export function memoryLessonFlagStore(): LessonFlagStore & {
  flags: Map<string, LessonFlagRecord>;
} {
  const flags = new Map<string, LessonFlagRecord>();
  return {
    flags,
    async submit(record) {
      const id = lessonFlagId(record, record.uid);
      const replaced = flags.has(id);
      flags.set(id, record);
      return { id, replaced };
    },
  };
}

import { FirebaseError } from "firebase/app";
import {
  Bytes,
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  writeBatch,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import { z } from "zod";
import { gunzipJson, gzipJson } from "@/lib/compress";
import { MAX_LESSON_BYTES } from "@/lib/library/sharedLibrary";
import { parseLesson, type Lesson } from "@/lib/schema";
import type { SavedLesson, SyncedCollection, SyncedRecords } from "@/lib/storage/db";
import {
  clearLocalData,
  enqueueRecord,
  getAllRecords,
  getMeta,
  getRecord,
  listOutbox,
  putRecord,
  removeFromOutbox,
  setMeta,
} from "@/lib/storage/records";
import { recordSchemas, syncFields } from "@/lib/storage/recordSchemas";
import {
  RemoteError,
  type AnyRecord,
  type LocalAdapter,
  type RemoteAdapter,
} from "@/lib/sync/engine";

/* The sync engine's two adapters: this device's IndexedDB and the student's Firestore folder. */

export const indexedDbAdapter: LocalAdapter = {
  getAll: getAllRecords,
  get: getRecord,
  async putFromRemote(c, record) {
    if (c === "savedLessons" && !(record as SavedLesson).lesson) {
      // A deletion from another device: mark our copy deleted (if we have one).
      const existing = await getRecord("savedLessons", record.id);
      if (existing) {
        await putRecord(
          "savedLessons",
          { ...existing, deleted: true, updatedAt: record.updatedAt },
          { fromSync: true },
        );
      }
      return;
    }
    await putRecord(c, record, { fromSync: true });
  },
  enqueue: enqueueRecord,
  listOutbox,
  removeFromOutbox,
  getMeta,
  setMeta,
  clearAll: clearLocalData,
};

/* Records downloaded from the cloud are checked before they are stored on the device. */
const SavedRefSchema = z.object({
  ...syncFields,
  savedAt: z.number(),
  libraryKey: z.string().optional(),
  lessonGz: z.custom<Bytes>((v) => v instanceof Bytes).optional(),
});

function toRemoteError(err: unknown): RemoteError {
  if (err instanceof RemoteError) return err;
  const code = err instanceof FirebaseError ? err.code : "";
  if (code.endsWith("resource-exhausted")) return new RemoteError("quota", code);
  if (/unavailable|deadline-exceeded|failed-precondition/.test(code))
    return new RemoteError("offline", code);
  if (/permission-denied|unauthenticated/.test(code)) return new RemoteError("permission", code);
  return new RemoteError("other", String(err));
}

/** The student's cloud copy: users/{uid}/{collection}/{id}. */
export function firestoreAdapter(db: Firestore, uid: string): RemoteAdapter {
  const libraryCache = new Map<string, Lesson | null>();

  async function lessonFromLibrary(key: string): Promise<Lesson | null> {
    if (!libraryCache.has(key)) {
      const snap = await getDocFromServer(doc(db, "lessons", key));
      const gz = snap.data()?.lessonGz;
      const parsed = gz instanceof Bytes ? parseLesson(await gunzipJson(gz.toUint8Array())) : null;
      libraryCache.set(key, parsed?.ok ? parsed.lesson : null);
    }
    return libraryCache.get(key) ?? null;
  }

  async function decodeSaved(data: DocumentData): Promise<SavedLesson | null> {
    const ref = SavedRefSchema.safeParse(data);
    if (!ref.success) return null;
    const { lessonGz, ...rest } = ref.data;
    if (rest.deleted) return { ...rest, lesson: undefined as unknown as Lesson }; // tombstone
    let lesson: Lesson | null = null;
    if (rest.libraryKey) lesson = await lessonFromLibrary(rest.libraryKey);
    if (!lesson && lessonGz) {
      const parsed = parseLesson(await gunzipJson(lessonGz.toUint8Array()));
      lesson = parsed.ok ? parsed.lesson : null;
    }
    return lesson ? { ...rest, lesson } : null;
  }

  async function encode(c: SyncedCollection, record: AnyRecord): Promise<DocumentData> {
    if (c !== "savedLessons") return { ...record };
    const saved = record as SavedLesson;
    const out: DocumentData = {
      id: saved.id,
      updatedAt: saved.updatedAt,
      deleted: saved.deleted,
      savedAt: saved.savedAt,
      libraryKey: saved.libraryKey,
    };
    // A lesson that isn't in the shared library travels with the student, compressed.
    if (!saved.deleted && !saved.libraryKey) {
      const gz = await gzipJson(saved.lesson);
      if (gz.byteLength <= MAX_LESSON_BYTES) out.lessonGz = Bytes.fromUint8Array(gz);
    }
    return out;
  }

  return {
    async pullAll<C extends SyncedCollection>(c: C) {
      try {
        const snap = await getDocsFromServer(collection(db, "users", uid, c));
        const records: SyncedRecords[C][] = [];
        for (const d of snap.docs) {
          if (c === "savedLessons") {
            const saved = await decodeSaved(d.data());
            if (saved) records.push(saved as SyncedRecords[C]);
          } else {
            const parsed = recordSchemas[c as Exclude<C, "savedLessons">].safeParse(d.data());
            if (parsed.success) records.push(parsed.data as SyncedRecords[C]);
          }
        }
        return records;
      } catch (err) {
        throw toRemoteError(err);
      }
    },
    async push(changes) {
      try {
        const batch = writeBatch(db);
        for (const { collection: c, record } of changes) {
          batch.set(doc(db, "users", uid, c, record.id), await encode(c, record));
        }
        await batch.commit();
      } catch (err) {
        throw toRemoteError(err);
      }
    },
  };
}

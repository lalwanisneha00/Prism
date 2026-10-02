/*
 * npm run test:firebase: checks the live Firebase project end to end.
 *  1. Security rules: students can only reach their own folder; the lesson library is
 *     read-only from browsers; signed-out visitors can read nothing.
 *  2. Sync: a "laptop" and a "phone" signed in as the same test student see the same data,
 *     including a lesson stored by reference to the shared library, and deletions.
 * It uses two temporary test accounts (sign-in tokens made with the Admin key) and deletes
 * them and their data at the end.
 */
import { existsSync } from "node:fs";
import { deleteApp, initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import {
  doc,
  getDocFromServer,
  initializeFirestore,
  memoryLocalCache,
  setDoc,
} from "firebase/firestore";
import { sampleLessons } from "@/data/sampleLessons";
import { adminFromEnv } from "@/lib/firebase/adminCore";
import { adminLibraryStore } from "@/lib/library/adminStore";
import { libraryKey, writeToLibrary } from "@/lib/library/sharedLibrary";
import type { OutboxEntry, SyncedCollection } from "@/lib/storage/db";
import { firestoreAdapter } from "@/lib/sync/adapters";
import { SyncEngine, type AnyRecord, type LocalAdapter } from "@/lib/sync/engine";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const A = "prism-test-student-a";
const B = "prism-test-student-b";
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? `  (${detail})` : ""}`);
};

/** A device's local copy, in memory (stands in for IndexedDB). */
function memoryDevice(): LocalAdapter {
  const data = new Map<string, Map<string, AnyRecord>>();
  const outbox = new Map<string, OutboxEntry>();
  const meta = new Map<string, unknown>();
  let clock = 0;
  const col = (c: string) => data.get(c) ?? data.set(c, new Map()).get(c)!;
  const enqueue = async (c: SyncedCollection, id: string) =>
    void outbox.set(`${c}/${id}`, { key: `${c}/${id}`, collection: c, id, queuedAt: ++clock });
  return {
    getAll: async (c) => [...col(c).values()] as never,
    get: async (c, id) => col(c).get(id) as never,
    putFromRemote: async (c, r) => void col(c).set(r.id, r),
    enqueue,
    listOutbox: async () => [...outbox.values()],
    removeFromOutbox: async (es) => es.forEach((e) => outbox.delete(e.key)),
    getMeta: async <T>(k: string) => meta.get(k) as T | undefined,
    setMeta: async (k, v) => void meta.set(k, v),
    clearAll: async () => {
      data.clear();
      outbox.clear();
    },
    // test helper: a local edit
    ...{
      edit: async (c: SyncedCollection, r: AnyRecord) => (col(c).set(r.id, r), enqueue(c, r.id)),
    },
  } as LocalAdapter;
}
type Device = LocalAdapter & { edit(c: SyncedCollection, r: AnyRecord): Promise<void> };

async function denied(p: Promise<unknown>): Promise<boolean> {
  try {
    await p;
    return false;
  } catch (err) {
    return String(err).includes("permission");
  }
}

async function main() {
  const admin = adminFromEnv(process.env);
  if (!admin) throw new Error("FIREBASE_ADMIN_* settings are missing from .env.local");
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = initializeApp(config, "prism-firebase-test");
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    ignoreUndefinedProperties: true,
  });
  const libKey = libraryKey({ ...sampleLessons[0].meta, topic: "zz-sync-test" });

  try {
    console.log("\nSecurity rules");
    check(
      "signed-out visitor cannot read a student's data",
      await denied(getDocFromServer(doc(db, "users", A, "settings", "app"))),
    );
    check(
      "signed-out visitor cannot read the lesson library",
      await denied(getDocFromServer(doc(db, "lessons", "x"))),
    );

    await signInWithCustomToken(auth, await admin.auth.createCustomToken(A));
    let ownWrite = true;
    try {
      await setDoc(doc(db, "users", A, "settings", "app"), {
        id: "app",
        updatedAt: 1,
        deleted: false,
      });
    } catch {
      ownWrite = false;
    }
    check("student can write their own folder", ownWrite);
    check(
      "student can read their own folder",
      (await getDocFromServer(doc(db, "users", A, "settings", "app"))).exists(),
    );
    check(
      "student cannot read another student's folder",
      await denied(getDocFromServer(doc(db, "users", B, "settings", "app"))),
    );
    check(
      "student cannot write another student's folder",
      await denied(setDoc(doc(db, "users", B, "settings", "app"), { x: 1 })),
    );
    check(
      "student can read the shared lesson library",
      !(await denied(getDocFromServer(doc(db, "lessons", "nothing-here")))),
    );
    check(
      "student cannot write the shared lesson library",
      await denied(setDoc(doc(db, "lessons", "hack"), { x: 1 })),
    );
    check(
      "nothing outside users/ and lessons/ is reachable",
      await denied(setDoc(doc(db, "other", "x"), { x: 1 })),
    );

    console.log("\nSync between two devices (same student)");
    await writeToLibrary(adminLibraryStore(admin.db), {
      ...sampleLessons[0],
      meta: { ...sampleLessons[0].meta, topic: "zz-sync-test" },
    });
    const laptop = memoryDevice() as Device;
    const lesson = sampleLessons[0];
    await laptop.edit("savedLessons", {
      id: "private",
      lesson,
      savedAt: 1,
      updatedAt: 10,
      deleted: false,
    } as AnyRecord);
    await laptop.edit("savedLessons", {
      id: "shared",
      lesson,
      savedAt: 1,
      updatedAt: 10,
      deleted: false,
      libraryKey: libKey,
    } as AnyRecord);
    await laptop.edit("recentTopics", {
      id: "em:gauss-law",
      subject: "em",
      chapter: "electrostatics",
      topic: "gauss-law",
      level: "first-encounter",
      duration: 10,
      title: "Gauss's law",
      chapterName: "Electrostatics",
      viewedAt: 10,
      updatedAt: 10,
      deleted: false,
    } as AnyRecord);
    await laptop.edit("audioPositions", {
      id: "em:gauss-law:first-encounter:10",
      title: "Gauss's law",
      seconds: 245,
      updatedAt: 10,
      deleted: false,
    } as AnyRecord);
    const laptopEngine = new SyncEngine({ uid: A, local: laptop, remote: firestoreAdapter(db, A) });
    await laptopEngine.start();
    check(
      "laptop uploaded its changes",
      laptopEngine.getStatus() === "synced",
      laptopEngine.getStatus(),
    );

    const phone = memoryDevice() as Device;
    await new SyncEngine({ uid: A, local: phone, remote: firestoreAdapter(db, A) }).start();
    const priv = (await phone.get("savedLessons", "private")) as
      { lesson?: { meta: { title: string } } } | undefined;
    const shared = (await phone.get("savedLessons", "shared")) as
      { lesson?: { sections: unknown[] } } | undefined;
    check(
      "phone restored a private saved lesson (compressed copy)",
      priv?.lesson?.meta.title === "Gauss's law",
    );
    check(
      "phone restored a library lesson from its reference",
      (shared?.lesson?.sections.length ?? 0) === 5,
    );
    check("phone got the recent topic", Boolean(await phone.get("recentTopics", "em:gauss-law")));
    check(
      "phone got the audio position",
      (
        (await phone.get("audioPositions", "em:gauss-law:first-encounter:10")) as
          { seconds?: number } | undefined
      )?.seconds === 245,
    );

    const sharedDoc = (
      await getDocFromServer(doc(db, "users", A, "savedLessons", "shared"))
    ).data();
    check(
      "a library lesson is stored as a reference, not a copy",
      Boolean(sharedDoc?.libraryKey) && !sharedDoc?.lessonGz,
    );

    await phone.edit("savedLessons", {
      ...(shared as AnyRecord),
      deleted: true,
      updatedAt: 20,
    } as AnyRecord);
    await new SyncEngine({ uid: A, local: phone, remote: firestoreAdapter(db, A) }).flush();
    await new SyncEngine({ uid: A, local: laptop, remote: firestoreAdapter(db, A) }).pullAndMerge();
    check(
      "a deletion on the phone reaches the laptop",
      ((await laptop.get("savedLessons", "shared")) as { deleted?: boolean } | undefined)
        ?.deleted === true,
    );

    console.log("\nAccount switching on a shared device");
    await signOut(auth);
    await signInWithCustomToken(auth, await admin.auth.createCustomToken(B));
    await new SyncEngine({ uid: B, local: phone, remote: firestoreAdapter(db, B) }).start();
    check(
      "a different student signing in starts with a clean device",
      (await phone.getAll("recentTopics")).length === 0,
    );
    const bDocs = await admin.db.collection("users").doc(B).collection("recentTopics").get();
    check("nothing from student A leaked into student B's cloud folder", bDocs.empty);
  } finally {
    await signOut(auth).catch(() => {});
    for (const uid of [A, B]) {
      await admin.db.recursiveDelete(admin.db.collection("users").doc(uid));
      await admin.auth.deleteUser(uid).catch(() => {});
    }
    await admin.db.collection("lessons").doc(libKey).delete();
    await deleteApp(app);
    console.log("\nCleaned up the test accounts and their data.");
  }

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll Firebase checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});

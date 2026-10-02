import type { Firestore } from "firebase-admin/firestore";
import type { LibraryStore } from "@/lib/library/sharedLibrary";

/** The shared library backed by Firestore through the Admin SDK (server only). */
export function adminLibraryStore(db: Firestore): LibraryStore {
  const lessons = db.collection("lessons");
  return {
    async get(key) {
      const snap = await lessons.doc(key).get();
      const data = snap.data();
      if (!data?.lessonGz) return null;
      const promptVersion = typeof data.promptVersion === "string" ? data.promptVersion : undefined;
      return { lessonGz: new Uint8Array(data.lessonGz), promptVersion };
    },
    async set(key, doc) {
      await lessons.doc(key).set({ ...doc, lessonGz: Buffer.from(doc.lessonGz) });
    },
  };
}

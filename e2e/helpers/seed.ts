import type { Page } from "@playwright/test";

/**
 * Fills a fresh browser with real-looking data (long names stretch dropdowns and cards):
 * a branch, three notes on the subject with the longest name, and two past mocks.
 * Call after the first page load, so the app has made its database.
 */
export async function seedStudyData(page: Page) {
  await page.evaluate(async () => {
    for (let i = 0; i < 50; i++) {
      const dbs = await indexedDB.databases();
      if (dbs.some((d) => d.name === "prism" && (d.version ?? 0) > 1)) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open("prism");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const now = Date.now();
    const subject = "pdeu-introduction-to-computer-programming-i-laboratory-civil";
    const sync = { updatedAt: now, deleted: false };
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(["settings", "annotations", "mockResults"], "readwrite");
      tx.objectStore("settings").put({ id: "app", ...sync, branch: "ece", semester: 3 });
      for (let i = 0; i < 3; i++) {
        tx.objectStore("annotations").put({
          id: `seed-${i}`,
          ...sync,
          lessonId: `seed-lesson-${i}`,
          lessonVersion: "1",
          subject,
          chapter: "unit-1",
          topic: "variables-and-data-types",
          level: "first-encounter",
          duration: 10,
          title: "Variables, data types and operators in C: a very long lesson title for testing",
          block: "section:intro",
          color: "important",
          anchor: { start: 0, end: 20, quote: "A variable is a named box", prefix: "", suffix: "" },
          comment: "",
          createdAt: now - i * 1000,
        });
      }
      for (let i = 0; i < 2; i++) {
        tx.objectStore("mockResults").put({
          id: `seed-mock-${i}`,
          ...sync,
          subject,
          chapter: "multiple",
          level: "exam-prep",
          minutes: 90,
          title: `Mock ${i + 1}: Introduction to Computer Programming -I Laboratory (For ME, CL, CH, BT)`,
          score: 42 - i * 7,
          total: 60,
          byTopic: [],
          at: now - i * 86_400_000,
          scope: { level: "subject", ids: [subject], label: "Whole subject" },
        });
      }
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  });
}

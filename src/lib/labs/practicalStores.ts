import type { LibraryStore } from "@/lib/library/sharedLibrary";
import type { SimulationStore } from "@/lib/labs/practicalLibrary";
import type { LessonFlagStore } from "@/lib/syllabusFix/lessonFlagStore";
import type { StaleTopics } from "@/lib/syllabusFix/stale";

/** Where /api/practical keeps lessons, flags and simulation choices (Firestore in the app). */
export type PracticalStores = {
  library: LibraryStore;
  flags: LessonFlagStore;
  simulations: SimulationStore;
  stale: () => Promise<StaleTopics>;
};

let injected: PracticalStores | null | undefined;

/** Tests only: in-memory stores instead of Firestore (null = no shared storage, undefined = reset). */
export function setPracticalStoresForTests(stores: PracticalStores | null | undefined): void {
  injected = stores;
}

export function practicalStoresForTests(): PracticalStores | null | undefined {
  return injected;
}

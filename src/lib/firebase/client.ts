import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebase/config";

export type ClientServices = { app: FirebaseApp; auth: Auth; db: Firestore };

let services: ClientServices | null = null;

/** Firebase in the browser, or null when accounts aren't configured (guest-only mode). */
export function getClientServices(): ClientServices | null {
  if (services) return services;
  const config = firebaseConfig();
  if (!config) return null;
  const app = getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(config);
  const db = initializeFirestore(app, {
    // Optional fields that are absent are simply not written.
    ignoreUndefinedProperties: true,
    // Firestore offline persistence (SPEC §9.3), shared safely between open tabs.
    localCache:
      typeof window === "undefined"
        ? memoryLocalCache()
        : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  services = { app, auth: getAuth(app), db };
  return services;
}
